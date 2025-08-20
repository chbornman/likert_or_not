use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use uuid::Uuid;

use crate::{
    AppState,
    auth::{log_action, RequireAuth},
    error::AppError,
    models_v2::*,
};

// ===== Forms Handlers =====

pub async fn list_forms(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let forms = sqlx::query_as!(
        Form,
        r#"
        SELECT id, title, description, status, settings as "settings: JsonValue",
               created_at as "created_at: DateTime<Utc>",
               updated_at as "updated_at: DateTime<Utc>"
        FROM forms
        WHERE status != 'archived'
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(Json(forms))
}

pub async fn get_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Get form details
    let form = sqlx::query_as!(
        Form,
        r#"
        SELECT id, title, description, status, settings as "settings: JsonValue",
               created_at as "created_at: DateTime<Utc>",
               updated_at as "updated_at: DateTime<Utc>"
        FROM forms
        WHERE id = ?1
        "#,
        form_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("Form not found".to_string()))?;

    // Get sections
    let sections = sqlx::query_as!(
        Section,
        r#"
        SELECT id, form_id, title, description, position,
               created_at as "created_at: DateTime<Utc>"
        FROM sections
        WHERE form_id = ?1
        ORDER BY position
        "#,
        form_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Get questions for each section
    let mut sections_with_questions = Vec::new();
    for section in sections {
        let questions = sqlx::query_as!(
            Question,
            r#"
            SELECT id, form_id, section_id, position,
                   type as question_type, title, description,
                   features as "features: JsonValue",
                   created_at as "created_at: DateTime<Utc>"
            FROM questions_v2
            WHERE form_id = ?1 AND section_id = ?2
            ORDER BY position
            "#,
            form_id,
            section.id
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        sections_with_questions.push(SectionWithQuestions {
            section,
            questions,
        });
    }

    // Get questions without sections
    let orphan_questions = sqlx::query_as!(
        Question,
        r#"
        SELECT id, form_id, section_id, position,
               type as question_type, title, description,
               features as "features: JsonValue",
               created_at as "created_at: DateTime<Utc>"
        FROM questions_v2
        WHERE form_id = ?1 AND section_id IS NULL
        ORDER BY position
        "#,
        form_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    if !orphan_questions.is_empty() {
        // Add a virtual section for questions without sections
        sections_with_questions.push(SectionWithQuestions {
            section: Section {
                id: "no-section".to_string(),
                form_id: form_id.clone(),
                title: "General Questions".to_string(),
                description: None,
                position: 999,
                created_at: Utc::now(),
            },
            questions: orphan_questions,
        });
    }

    let response = FormWithSections {
        form,
        sections: sections_with_questions,
    };

    Ok(Json(response))
}

pub async fn create_form(
    _auth: RequireAuth,
    State(state): State<AppState>,
    Json(req): Json<CreateFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    req.validate()
        .map_err(|e| AppError::ValidationError(e))?;

    let id = Uuid::new_v4().to_string();
    let status = req.status.unwrap_or_else(|| "draft".to_string());
    let settings = req.settings.unwrap_or_else(|| json!({}));

    let form = sqlx::query_as!(
        Form,
        r#"
        INSERT INTO forms (id, title, description, status, settings)
        VALUES (?1, ?2, ?3, ?4, ?5)
        RETURNING id, title, description, status, settings as "settings: JsonValue",
                  created_at as "created_at: DateTime<Utc>",
                  updated_at as "updated_at: DateTime<Utc>"
        "#,
        id,
        req.title,
        req.description,
        status,
        settings
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Log the action
    log_action(
        &state.db,
        Some(&_auth.user.id),
        "create_form",
        Some("form"),
        Some(&form.id),
        Some(json!({ "title": form.title })),
        None,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(form)))
}

pub async fn update_form(
    _auth: RequireAuth,
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<UpdateFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Build dynamic update query
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(title) = req.title {
        updates.push("title = ?");
        params.push(title);
    }
    if let Some(description) = req.description {
        updates.push("description = ?");
        params.push(description);
    }
    if let Some(status) = req.status {
        updates.push("status = ?");
        params.push(status);
    }
    
    if updates.is_empty() && req.settings.is_none() {
        return Err(AppError::ValidationError("No fields to update".to_string()));
    }

    // Update settings separately if provided
    if let Some(settings) = req.settings {
        sqlx::query!(
            r#"UPDATE forms SET settings = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"#,
            settings,
            form_id
        )
        .execute(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    }

    // Update other fields if any
    if !updates.is_empty() {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        let query = format!("UPDATE forms SET {} WHERE id = ?", updates.join(", "));
        
        let mut q = sqlx::query(&query);
        for param in params {
            q = q.bind(param);
        }
        q = q.bind(&form_id);
        
        q.execute(&state.db)
            .await
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    }

    // Log the action
    log_action(
        &state.db,
        Some(&_auth.user.id),
        "update_form",
        Some("form"),
        Some(&form_id),
        Some(json!({ "updates": updates })),
        None,
    )
    .await?;

    Ok(StatusCode::OK)
}

pub async fn delete_form(
    _auth: RequireAuth,
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Soft delete by setting status to archived
    sqlx::query!(
        r#"UPDATE forms SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?1"#,
        form_id
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Log the action
    log_action(
        &state.db,
        Some(&_auth.user.id),
        "delete_form",
        Some("form"),
        Some(&form_id),
        None,
        None,
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// ===== Form Submission Handlers =====

pub async fn submit_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<SubmitFormRequest>,
) -> Result<impl IntoResponse, AppError> {
    req.validate()
        .map_err(|e| AppError::ValidationError(e))?;

    // Verify form exists and is published
    let form = sqlx::query!(
        r#"SELECT status FROM forms WHERE id = ?1"#,
        form_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("Form not found".to_string()))?;

    if form.status != "published" {
        return Err(AppError::ValidationError("Form is not accepting responses".to_string()));
    }

    // Start transaction
    let mut tx = state.db.begin()
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Create response
    let response_id = Uuid::new_v4().to_string();
    sqlx::query!(
        r#"
        INSERT INTO responses_v2 (id, form_id, respondent_name, respondent_email, metadata)
        VALUES (?1, ?2, ?3, ?4, ?5)
        "#,
        response_id,
        form_id,
        req.respondent_name,
        req.respondent_email,
        json!({})
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Insert answers
    for answer in req.answers {
        let answer_id = Uuid::new_v4().to_string();
        sqlx::query!(
            r#"
            INSERT INTO answers_v2 (id, response_id, question_id, value)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            answer_id,
            response_id,
            answer.question_id,
            answer.value
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok((StatusCode::CREATED, Json(json!({ "id": response_id }))))
}

// ===== Response Viewing Handlers (Admin only) =====

pub async fn list_responses(
    _auth: RequireAuth,
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let responses = sqlx::query_as!(
        Response,
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at as "submitted_at: DateTime<Utc>",
               ip_address, metadata as "metadata: JsonValue"
        FROM responses_v2
        WHERE form_id = ?1
        ORDER BY submitted_at DESC
        "#,
        form_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(Json(responses))
}

pub async fn get_response(
    _auth: RequireAuth,
    Path((form_id, response_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Get response details
    let response = sqlx::query_as!(
        Response,
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at as "submitted_at: DateTime<Utc>",
               ip_address, metadata as "metadata: JsonValue"
        FROM responses_v2
        WHERE id = ?1 AND form_id = ?2
        "#,
        response_id,
        form_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("Response not found".to_string()))?;

    // Get answers with question details
    let answers = sqlx::query!(
        r#"
        SELECT a.id, a.response_id, a.question_id, a.value,
               a.created_at,
               q.type as question_type, q.title as question_title,
               q.description as question_description, q.features
        FROM answers_v2 a
        JOIN questions_v2 q ON a.question_id = q.id
        WHERE a.response_id = ?1
        ORDER BY q.position
        "#,
        response_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let answers_with_questions: Vec<AnswerWithQuestion> = answers
        .into_iter()
        .map(|a| AnswerWithQuestion {
            answer: Answer {
                id: a.id,
                response_id: a.response_id,
                question_id: a.question_id.clone(),
                value: serde_json::from_str(&a.value).unwrap_or(json!(null)),
                created_at: DateTime::parse_from_rfc3339(&a.created_at)
                    .unwrap()
                    .with_timezone(&Utc),
            },
            question: Question {
                id: a.question_id,
                form_id: form_id.clone(),
                section_id: None, // Would need to join sections table for this
                position: 0, // Would need to include in query
                question_type: a.question_type,
                title: a.question_title,
                description: a.question_description,
                features: serde_json::from_str(&a.features).unwrap_or(json!({})),
                created_at: Utc::now(), // Placeholder
            },
        })
        .collect();

    let response_with_answers = ResponseWithAnswers {
        response,
        answers: answers_with_questions,
    };

    Ok(Json(response_with_answers))
}

// ===== Statistics Handler =====

pub async fn get_form_stats(
    _auth: RequireAuth,
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Get total responses
    let total_responses = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as count FROM responses_v2 WHERE form_id = ?1"#,
        form_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .unwrap_or(0);

    // Get sections with questions
    let sections = sqlx::query!(
        r#"
        SELECT s.id, s.title
        FROM sections s
        WHERE s.form_id = ?1
        ORDER BY s.position
        "#,
        form_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let mut section_stats = Vec::new();
    
    for section in sections {
        // Get questions for this section
        let questions = sqlx::query!(
            r#"
            SELECT q.id, q.title, q.type
            FROM questions_v2 q
            WHERE q.form_id = ?1 AND q.section_id = ?2
            ORDER BY q.position
            "#,
            form_id,
            section.id
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut question_stats = Vec::new();
        
        for question in questions {
            // Get stats for each question based on type
            let stats = if question.r#type == "likert" {
                // Calculate Likert scale statistics
                let results = sqlx::query!(
                    r#"
                    SELECT 
                        COUNT(*) as count,
                        AVG(CAST(json_extract(value, '$.rating') AS REAL)) as avg_rating,
                        MIN(CAST(json_extract(value, '$.rating') AS INTEGER)) as min_rating,
                        MAX(CAST(json_extract(value, '$.rating') AS INTEGER)) as max_rating
                    FROM answers_v2
                    WHERE question_id = ?1
                    "#,
                    question.id
                )
                .fetch_one(&state.db)
                .await
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;
                
                json!({
                    "type": "likert",
                    "count": results.count,
                    "average": results.avg_rating,
                    "min": results.min_rating,
                    "max": results.max_rating
                })
            } else {
                // For other types, just count responses
                let count = sqlx::query_scalar!(
                    r#"SELECT COUNT(*) FROM answers_v2 WHERE question_id = ?1"#,
                    question.id
                )
                .fetch_one(&state.db)
                .await
                .map_err(|e| AppError::DatabaseError(e.to_string()))?
                .unwrap_or(0);
                
                json!({
                    "type": question.r#type,
                    "count": count
                })
            };
            
            question_stats.push(QuestionStats {
                question_id: question.id,
                question_title: question.title,
                question_type: question.r#type,
                response_count: stats["count"].as_i64().unwrap_or(0),
                stats,
            });
        }
        
        section_stats.push(SectionStats {
            section_id: section.id,
            section_title: section.title,
            questions: question_stats,
        });
    }

    let form_stats = FormStats {
        form_id,
        total_responses,
        completion_rate: 1.0, // TODO: Calculate actual completion rate
        average_time: None, // TODO: Calculate average time
        sections: section_stats,
    };

    Ok(Json(form_stats))
}

// ===== Export Handler =====

#[derive(Deserialize)]
pub struct ExportQuery {
    format: Option<String>, // csv, json, etc.
}

pub async fn export_form_data(
    _auth: RequireAuth,
    Path(form_id): Path<String>,
    Query(query): Query<ExportQuery>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let format = query.format.unwrap_or_else(|| "csv".to_string());
    
    // For now, return JSON format
    // TODO: Implement CSV export
    
    // Get form
    let form = sqlx::query_as!(
        Form,
        r#"
        SELECT id, title, description, status, settings as "settings: JsonValue",
               created_at as "created_at: DateTime<Utc>",
               updated_at as "updated_at: DateTime<Utc>"
        FROM forms
        WHERE id = ?1
        "#,
        form_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("Form not found".to_string()))?;

    // Get all responses with answers
    let responses = sqlx::query_as!(
        Response,
        r#"
        SELECT id, form_id, respondent_name, respondent_email,
               submitted_at as "submitted_at: DateTime<Utc>",
               ip_address, metadata as "metadata: JsonValue"
        FROM responses_v2
        WHERE form_id = ?1
        ORDER BY submitted_at DESC
        "#,
        form_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let mut responses_with_answers = Vec::new();
    
    for response in responses {
        let answers = sqlx::query!(
            r#"
            SELECT a.id, a.response_id, a.question_id, a.value, a.created_at,
                   q.type as question_type, q.title as question_title,
                   q.description as question_description, q.features
            FROM answers_v2 a
            JOIN questions_v2 q ON a.question_id = q.id
            WHERE a.response_id = ?1
            ORDER BY q.position
            "#,
            response.id
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let answers_with_questions: Vec<AnswerWithQuestion> = answers
            .into_iter()
            .map(|a| AnswerWithQuestion {
                answer: Answer {
                    id: a.id,
                    response_id: a.response_id,
                    question_id: a.question_id.clone(),
                    value: serde_json::from_str(&a.value).unwrap_or(json!(null)),
                    created_at: DateTime::parse_from_rfc3339(&a.created_at)
                        .unwrap()
                        .with_timezone(&Utc),
                },
                question: Question {
                    id: a.question_id,
                    form_id: form_id.clone(),
                    section_id: None,
                    position: 0,
                    question_type: a.question_type,
                    title: a.question_title,
                    description: a.question_description,
                    features: serde_json::from_str(&a.features).unwrap_or(json!({})),
                    created_at: Utc::now(),
                },
            })
            .collect();

        responses_with_answers.push(ResponseWithAnswers {
            response,
            answers: answers_with_questions,
        });
    }

    let export_data = ExportData {
        form,
        responses: responses_with_answers,
        exported_at: Utc::now(),
    };

    Ok(Json(export_data))
}