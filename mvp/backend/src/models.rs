use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Question {
    pub id: i32,
    pub question_text: String,
    pub is_required: bool,
    pub allow_comment: bool,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Response {
    pub id: i32,
    pub respondent_name: String,
    pub respondent_email: String,
    pub submitted_at: String,
    pub ip_address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Answer {
    pub id: i32,
    pub response_id: i32,
    pub question_id: i32,
    pub likert_value: Option<i32>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmissionRequest {
    pub respondent_name: String,
    pub respondent_email: String,
    pub answers: Vec<AnswerInput>,
}

#[derive(Debug, Deserialize)]
pub struct AnswerInput {
    pub question_id: i32,
    pub likert_value: Option<i32>,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FormData {
    pub title: String,
    pub description: String,
    pub questions: Vec<Question>,
}

#[derive(Debug, Serialize)]
pub struct ResponseWithAnswers {
    pub response: Response,
    pub answers: Vec<AnswerWithQuestion>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AnswerWithQuestion {
    pub question_text: String,
    pub likert_value: Option<i32>,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_responses: i32,
    pub average_scores: Vec<QuestionAverage>,
    pub questions_with_comments: Vec<QuestionWithComments>,
    pub recent_responses: Vec<Response>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QuestionAverage {
    pub question_id: i32,
    pub question_text: String,
    pub position: i32,
    pub average_score: f64,
    pub response_count: i32,
}

#[derive(Debug, Serialize)]
pub struct QuestionWithComments {
    pub question_id: i32,
    pub question_text: String,
    pub position: i32,
    pub average_score: f64,
    pub response_count: i32,
    pub comments: Vec<String>,
}