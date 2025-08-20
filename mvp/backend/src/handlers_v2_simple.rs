use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    AppState,
    error::AppError,
    models_v2::*,
};

// Simplified handlers using runtime queries

pub async fn list_forms(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let forms = sqlx::query_as::<_, Form>(
        r#"
        SELECT id, title, description, status, settings,
               created_at, updated_at
        FROM forms
        WHERE status != 'archived'
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(Json(forms))
}

pub async fn get_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Fetch the form
    let form = sqlx::query_as::<_, Form>(
        r#"
        SELECT id, title, description, status, settings,
               created_at, updated_at
        FROM forms
        WHERE id = ?
        "#
    )
    .bind(&form_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    if let Some(form) = form {
        // Fetch sections for this form
        let sections = sqlx::query_as::<_, Section>(
            r#"
            SELECT id, form_id, title, description, position, created_at
            FROM sections
            WHERE form_id = ?
            ORDER BY position
            "#
        )
        .bind(&form_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;

        // Fetch questions for this form
        let questions = sqlx::query_as::<_, Question>(
            r#"
            SELECT id, form_id, section_id, position, type as question_type, title, description, features, created_at
            FROM questions_v2
            WHERE form_id = ?
            ORDER BY position
            "#
        )
        .bind(&form_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;

        // Build sections with their questions
        let mut sections_with_questions = Vec::new();
        for section in sections {
            let section_questions: Vec<Question> = questions
                .iter()
                .filter(|q| q.section_id.as_ref() == Some(&section.id))
                .cloned()
                .collect();
            
            sections_with_questions.push(json!({
                "id": section.id,
                "form_id": section.form_id,
                "title": section.title,
                "description": section.description,
                "position": section.position,
                "questions": section_questions
            }));
        }

        // Also include questions without sections
        let orphan_questions: Vec<Question> = questions
            .iter()
            .filter(|q| q.section_id.is_none())
            .cloned()
            .collect();

        if !orphan_questions.is_empty() {
            sections_with_questions.push(json!({
                "id": "orphan-questions",
                "form_id": form_id,
                "title": "Additional Questions",
                "description": null,
                "position": 999,
                "questions": orphan_questions
            }));
        }

        Ok(Json(json!({
            "id": form.id,
            "title": form.title,
            "description": form.description,
            "status": form.status,
            "settings": form.settings,
            "sections": sections_with_questions
        })))
    } else {
        Err(AppError::BadRequest("Form not found".to_string()))
    }
}

pub async fn submit_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<SubmitFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Simple submission handler
    let response_id = Uuid::new_v4().to_string();
    
    // Insert response
    sqlx::query(
        r#"
        INSERT INTO responses_v2 (id, form_id, respondent_name, respondent_email, metadata)
        VALUES (?, ?, ?, ?, ?)
        "#
    )
    .bind(&response_id)
    .bind(&form_id)
    .bind(&req.respondent_name)
    .bind(&req.respondent_email)
    .bind(json!({}))
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    // Insert answers
    for answer in req.answers {
        let answer_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO answers_v2 (id, response_id, question_id, value)
            VALUES (?, ?, ?, ?)
            "#
        )
        .bind(&answer_id)
        .bind(&response_id)
        .bind(&answer.question_id)
        .bind(&answer.value)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;
    }

    Ok((StatusCode::CREATED, Json(json!({ "id": response_id }))))
}

// Admin handlers - these would check auth in production

pub async fn create_form(
    State(state): State<AppState>,
    Json(req): Json<CreateFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    let id = Uuid::new_v4().to_string();
    let status = req.status.unwrap_or_else(|| "draft".to_string());
    let settings = req.settings.unwrap_or_else(|| json!({}));

    sqlx::query(
        r#"
        INSERT INTO forms (id, title, description, status, settings)
        VALUES (?, ?, ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&status)
    .bind(&settings)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok((StatusCode::CREATED, Json(json!({ "id": id }))))
}

pub async fn update_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<UpdateFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Simple update - in production would be more dynamic
    if let Some(status) = req.status {
        sqlx::query(
            r#"UPDATE forms SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"#
        )
        .bind(&status)
        .bind(&form_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;
    }

    Ok(StatusCode::OK)
}

pub async fn delete_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Soft delete by archiving
    sqlx::query(
        r#"UPDATE forms SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?"#
    )
    .bind(&form_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_responses(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let responses = sqlx::query_as::<_, Response>(
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at, ip_address, metadata
        FROM responses_v2
        WHERE form_id = ?
        ORDER BY submitted_at DESC
        "#
    )
    .bind(&form_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(Json(responses))
}

pub async fn get_response(
    Path((form_id, response_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let response = sqlx::query_as::<_, Response>(
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at, ip_address, metadata
        FROM responses_v2
        WHERE id = ? AND form_id = ?
        "#
    )
    .bind(&response_id)
    .bind(&form_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    if let Some(response) = response {
        Ok(Json(response))
    } else {
        Err(AppError::BadRequest("Response not found".to_string()))
    }
}

pub async fn get_form_stats(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Simple stats for now
    let count: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM responses_v2 WHERE form_id = ?"#
    )
    .bind(&form_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or((0,));

    Ok(Json(json!({
        "form_id": form_id,
        "total_responses": count.0,
        "sections": []
    })))
}

pub async fn export_form_data(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Simple export - in production would generate CSV
    let responses = sqlx::query_as::<_, Response>(
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at, ip_address, metadata
        FROM responses_v2
        WHERE form_id = ?
        ORDER BY submitted_at DESC
        "#
    )
    .bind(&form_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(Json(json!({
        "form_id": form_id,
        "responses": responses,
        "exported_at": chrono::Utc::now()
    })))
}