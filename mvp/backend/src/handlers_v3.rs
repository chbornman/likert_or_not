use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::{json, Value as JsonValue};
use uuid::Uuid;

use crate::{
    AppState,
    error::AppError,
    models_v3::*,
};

/// List all published forms
pub async fn list_forms(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let forms: Vec<(String, String, Option<String>, Option<String>)> = sqlx::query_as(
        r#"
        SELECT id, title, description, instructions
        FROM forms
        WHERE status != 'archived'
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    let forms_json: Vec<JsonValue> = forms.into_iter().map(|(id, title, desc, instructions)| {
        json!({
            "id": id,
            "title": title,
            "description": desc,
            "instructions": instructions
        })
    }).collect();
    
    Ok(Json(forms_json))
}

/// Get a specific form with its sections and questions
pub async fn get_form(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Fetch the form
    let form: Option<(String, String, Option<String>, Option<String>, String)> = sqlx::query_as(
        r#"
        SELECT id, title, description, instructions, status
        FROM forms
        WHERE id = ?
        "#
    )
    .bind(&form_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    if let Some((id, title, desc, instructions, status)) = form {
        // Fetch sections
        let sections: Vec<(String, String, String, Option<String>, i32)> = sqlx::query_as(
            r#"
            SELECT id, form_id, title, description, position
            FROM sections
            WHERE form_id = ?
            ORDER BY position
            "#
        )
        .bind(&form_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;

        // Fetch questions
        let questions: Vec<(String, Option<String>, i32, String, String, Option<String>, JsonValue)> = 
            sqlx::query_as(
                r#"
                SELECT id, section_id, position, type, title, description, features
                FROM questions
                WHERE form_id = ?
                ORDER BY position
                "#
            )
            .bind(&form_id)
            .fetch_all(&state.db)
            .await
            .map_err(|e| AppError::Database(e))?;

        // Build sections with questions
        let mut sections_with_questions = Vec::new();
        for (s_id, _, s_title, s_desc, s_pos) in sections {
            let section_questions: Vec<JsonValue> = questions
                .iter()
                .filter(|(_, section_id, _, _, _, _, _)| section_id.as_ref() == Some(&s_id))
                .map(|(q_id, _, pos, q_type, title, desc, features)| {
                    json!({
                        "id": q_id,
                        "position": pos,
                        "type": q_type,
                        "title": title,
                        "description": desc,
                        "features": features
                    })
                })
                .collect();
            
            sections_with_questions.push(json!({
                "id": s_id,
                "title": s_title,
                "description": s_desc,
                "position": s_pos,
                "questions": section_questions
            }));
        }

        Ok(Json(json!({
            "id": id,
            "title": title,
            "description": desc,
            "instructions": instructions,
            "status": status,
            "sections": sections_with_questions
        })))
    } else {
        Err(AppError::BadRequest("Form not found".to_string()))
    }
}

/// Submit a form with PII separation
pub async fn submit_form_with_privacy(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<SubmitFormRequestV3>,
) -> Result<impl IntoResponse, AppError> {
    // Validate request
    req.validate()
        .map_err(|e| AppError::BadRequest(e))?;
    
    // Generate email hash for duplicate checking
    let email_hash = req.email_hash();
    
    // Start transaction
    let mut tx = state.db.begin().await
        .map_err(|e| AppError::Database(e))?;
    
    // Check for duplicate submission
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM respondents WHERE email_hash = ?"
    )
    .bind(&email_hash)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    // Get or create respondent
    let respondent_id = if let Some((id,)) = existing {
        // Check if they already submitted for this form
        let already_submitted: Option<(i64,)> = sqlx::query_as(
            "SELECT COUNT(*) FROM responses WHERE respondent_id = ? AND form_id = ?"
        )
        .bind(&id)
        .bind(&form_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        if let Some((count,)) = already_submitted {
            if count > 0 {
                return Err(AppError::BadRequest(
                    "You have already submitted a response for this form".to_string()
                ));
            }
        }
        
        id
    } else {
        // Create new respondent
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO respondents (id, name, email, email_hash) VALUES (?, ?, ?, ?)"
        )
        .bind(&new_id)
        .bind(&req.respondent_name)
        .bind(&req.respondent_email)
        .bind(&email_hash)
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        new_id
    };
    
    // Create response (without PII)
    let response_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO responses (id, respondent_id, form_id, role, metadata)
        VALUES (?, ?, ?, ?, ?)
        "#
    )
    .bind(&response_id)
    .bind(&respondent_id)
    .bind(&form_id)
    .bind(&req.role)
    .bind(json!({}))
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    // Insert answers
    for answer in req.answers {
        let answer_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO answers (id, response_id, question_id, value)
            VALUES (?, ?, ?, ?)
            "#
        )
        .bind(&answer_id)
        .bind(&response_id)
        .bind(&answer.question_id)
        .bind(&answer.value)
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::Database(e))?;
    }
    
    // Commit transaction
    tx.commit().await
        .map_err(|e| AppError::Database(e))?;
    
    Ok((StatusCode::CREATED, Json(json!({ 
        "id": response_id,
        "message": "Response submitted successfully"
    }))))
}

/// Get anonymous statistics for a form (no PII)
pub async fn get_form_stats_anonymous(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Get total responses
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM responses WHERE form_id = ?"
    )
    .bind(&form_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    // Get role distribution
    let role_distribution: Vec<RoleCount> = sqlx::query_as(
        r#"
        SELECT role, COUNT(*) as count 
        FROM responses 
        WHERE form_id = ?
        GROUP BY role
        ORDER BY count DESC
        "#
    )
    .bind(&form_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    // Get question statistics
    let question_stats_raw: Vec<(String, String, i64, Option<f64>)> = sqlx::query_as(
        r#"
        SELECT 
            q.id as question_id,
            q.title as question_title,
            COUNT(DISTINCT a.response_id) as response_count,
            AVG(CASE 
                WHEN json_type(a.value) = 'integer' THEN CAST(a.value as REAL)
                WHEN json_type(a.value) = 'object' AND json_extract(a.value, '$.rating') IS NOT NULL 
                    THEN CAST(json_extract(a.value, '$.rating') as REAL)
                ELSE NULL
            END) as average_rating
        FROM questions q
        LEFT JOIN answers a ON a.question_id = q.id
        LEFT JOIN responses r ON r.id = a.response_id
        WHERE q.form_id = ? AND q.type = 'likert'
        GROUP BY q.id, q.title
        ORDER BY q.position
        "#
    )
    .bind(&form_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    // Convert to proper structure
    let mut question_stats = Vec::new();
    for (q_id, q_title, count, avg) in question_stats_raw {
        // Get rating distribution for this question
        let rating_dist: Vec<RatingCount> = sqlx::query_as(
            r#"
            SELECT 
                CASE 
                    WHEN json_type(value) = 'integer' THEN CAST(value as INTEGER)
                    WHEN json_type(value) = 'object' THEN CAST(json_extract(value, '$.rating') as INTEGER)
                END as rating,
                COUNT(*) as count
            FROM answers a
            JOIN responses r ON r.id = a.response_id
            WHERE a.question_id = ? AND r.form_id = ?
                AND (json_type(value) = 'integer' OR json_extract(value, '$.rating') IS NOT NULL)
            GROUP BY rating
            ORDER BY rating
            "#
        )
        .bind(&q_id)
        .bind(&form_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        question_stats.push(QuestionStat {
            question_id: q_id,
            question_title: q_title,
            response_count: count,
            average_rating: avg,
            rating_distribution: rating_dist,
        });
    }
    
    Ok(Json(AnonymousStats {
        form_id,
        total_responses: total.0,
        role_distribution,
        question_stats,
    }))
}

/// Get responses with PII (admin only, requires authentication)
pub async fn get_responses_with_pii(
    Path(form_id): Path<String>,
    State(state): State<AppState>,
    // Add auth check here in production
) -> Result<impl IntoResponse, AppError> {
    // Fetch responses with PII joined
    let responses_raw: Vec<(String, String, Option<String>, Option<String>, Option<String>, String)> = 
        sqlx::query_as(
            r#"
            SELECT 
                r.id,
                r.form_id,
                res.name,
                res.email,
                r.role,
                r.submitted_at
            FROM responses r
            LEFT JOIN respondents res ON res.id = r.respondent_id
            WHERE r.form_id = ?
            ORDER BY r.submitted_at DESC
            "#
        )
        .bind(&form_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;
    
    let mut responses = Vec::new();
    
    for (id, form_id, name, email, role, submitted_at) in responses_raw {
        // Get answers for this response
        let answers: Vec<(String, String, JsonValue)> = sqlx::query_as(
            r#"
            SELECT 
                a.question_id,
                q.title,
                a.value
            FROM answers a
            JOIN questions q ON q.id = a.question_id
            WHERE a.response_id = ?
            ORDER BY q.position
            "#
        )
        .bind(&id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        let answers_formatted = answers.into_iter().map(|(q_id, q_title, value)| {
            AnswerWithQuestion {
                question_id: q_id,
                question_title: q_title,
                value,
            }
        }).collect();
        
        responses.push(ResponseWithPII {
            id,
            form_id,
            respondent_name: name,
            respondent_email: email,
            role,
            submitted_at: submitted_at.parse().unwrap_or_else(|_| Utc::now()),
            answers: answers_formatted,
        });
    }
    
    Ok(Json(responses))
}

/// Delete PII for a specific respondent (GDPR compliance)
pub async fn delete_respondent_pii(
    Path(respondent_id): Path<String>,
    State(state): State<AppState>,
    // Add auth check here in production
) -> Result<impl IntoResponse, AppError> {
    // This deletes the PII but keeps the anonymous response data
    let result = sqlx::query(
        "DELETE FROM respondents WHERE id = ?"
    )
    .bind(&respondent_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;
    
    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest("Respondent not found".to_string()));
    }
    
    Ok(Json(json!({
        "message": "PII deleted successfully",
        "note": "Response data remains anonymous in the system"
    })))
}