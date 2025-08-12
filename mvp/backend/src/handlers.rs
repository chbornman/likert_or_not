use axum::{
    extract::{Query, State},
    http::header,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use crate::{
    AppState,
    error::{AppError, Result},
    models::*,
    email,
};

#[derive(Deserialize)]
pub struct AuthQuery {
    token: String,
}

pub async fn get_form(State(state): State<AppState>) -> Result<Json<FormData>> {
    let questions = sqlx::query_as::<_, Question>(
        "SELECT * FROM questions ORDER BY position"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(FormData {
        title: "Executive Director Performance Review".to_string(),
        description: "Please provide your assessment of the Executive Director's performance using the scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree. Comments are encouraged to provide context for your ratings.".to_string(),
        questions,
    }))
}

pub async fn submit_response(
    State(state): State<AppState>,
    Json(submission): Json<SubmissionRequest>,
) -> Result<Json<serde_json::Value>> {
    if submission.respondent_name.trim().is_empty() || submission.respondent_email.trim().is_empty() {
        return Err(AppError::BadRequest("Name and email are required".to_string()));
    }

    let mut tx = state.db.begin().await?;

    let response_id = sqlx::query(
        "INSERT INTO responses (respondent_name, respondent_email) VALUES (?, ?)"
    )
    .bind(&submission.respondent_name)
    .bind(&submission.respondent_email)
    .execute(&mut *tx)
    .await?
    .last_insert_rowid();

    for answer in submission.answers {
        if answer.likert_value.is_none() && answer.comment.is_none() {
            continue;
        }

        sqlx::query(
            "INSERT INTO answers (response_id, question_id, likert_value, comment) VALUES (?, ?, ?, ?)"
        )
        .bind(response_id)
        .bind(answer.question_id)
        .bind(answer.likert_value)
        .bind(&answer.comment)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    if !state.resend_api_key.is_empty() && !state.notification_email.is_empty() {
        if let Err(e) = email::send_notification(
            &state.resend_api_key,
            &state.notification_email,
            &submission.respondent_name,
            &submission.respondent_email,
        ).await {
            tracing::error!("Failed to send email notification: {:?}", e);
        }
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Thank you for your feedback!"
    })))
}

pub async fn get_responses(
    State(state): State<AppState>,
    Query(auth): Query<AuthQuery>,
) -> Result<Json<Vec<ResponseWithAnswers>>> {
    if auth.token != state.admin_token {
        return Err(AppError::Unauthorized);
    }

    let responses = sqlx::query_as::<_, Response>(
        "SELECT * FROM responses ORDER BY submitted_at DESC"
    )
    .fetch_all(&state.db)
    .await?;

    let mut result = Vec::new();

    for response in responses {
        let answers = sqlx::query_as::<_, AnswerWithQuestion>(
            r#"
            SELECT q.question_text, a.likert_value, a.comment
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            WHERE a.response_id = ?
            ORDER BY q.position
            "#
        )
        .bind(response.id)
        .fetch_all(&state.db)
        .await?;

        result.push(ResponseWithAnswers {
            response,
            answers,
        });
    }

    Ok(Json(result))
}

pub async fn export_csv(
    State(state): State<AppState>,
    Query(auth): Query<AuthQuery>,
) -> Result<impl IntoResponse> {
    if auth.token != state.admin_token {
        return Err(AppError::Unauthorized);
    }

    let responses = get_all_responses_for_export(&state.db).await?;
    
    let mut wtr = csv::Writer::from_writer(vec![]);
    
    wtr.write_record(&[
        "Response ID",
        "Name",
        "Email",
        "Submitted At",
        "Question",
        "Score",
        "Comment",
    ]).map_err(|_| AppError::InternalServerError)?;

    for row in responses {
        wtr.write_record(&[
            row.0.to_string(),
            row.1,
            row.2,
            row.3,
            row.4,
            row.5.map_or(String::new(), |v| v.to_string()),
            row.6.unwrap_or_default(),
        ]).map_err(|_| AppError::InternalServerError)?;
    }

    let csv_data = String::from_utf8(wtr.into_inner().map_err(|_| AppError::InternalServerError)?).map_err(|_| AppError::InternalServerError)?;

    Ok((
        [(header::CONTENT_TYPE, "text/csv")],
        csv_data,
    ))
}

async fn get_all_responses_for_export(
    db: &sqlx::SqlitePool,
) -> Result<Vec<(i32, String, String, String, String, Option<i32>, Option<String>)>> {
    let rows = sqlx::query_as(
        r#"
        SELECT 
            r.id,
            r.respondent_name,
            r.respondent_email,
            r.submitted_at,
            q.question_text,
            a.likert_value,
            a.comment
        FROM responses r
        JOIN answers a ON r.id = a.response_id
        JOIN questions q ON a.question_id = q.id
        ORDER BY r.submitted_at DESC, q.position
        "#
    )
    .fetch_all(db)
    .await?;

    Ok(rows)
}

pub async fn get_stats(
    State(state): State<AppState>,
    Query(auth): Query<AuthQuery>,
) -> Result<Json<Stats>> {
    if auth.token != state.admin_token {
        return Err(AppError::Unauthorized);
    }

    let total: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM responses")
        .fetch_one(&state.db)
        .await?;

    let averages = sqlx::query_as::<_, QuestionAverage>(
        r#"
        SELECT 
            q.question_text,
            AVG(CAST(a.likert_value AS REAL)) as average_score,
            COUNT(a.likert_value) as response_count
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE a.likert_value IS NOT NULL
        GROUP BY q.id, q.question_text
        ORDER BY q.position
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let recent = sqlx::query_as::<_, Response>(
        "SELECT * FROM responses ORDER BY submitted_at DESC LIMIT 5"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(Stats {
        total_responses: total.0,
        average_scores: averages,
        recent_responses: recent,
    }))
}