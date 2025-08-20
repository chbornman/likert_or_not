use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;

// ===== Forms =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Form {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub settings: JsonValue,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFormRequest {
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub settings: Option<JsonValue>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFormRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub settings: Option<JsonValue>,
}

// ===== Sections =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Section {
    pub id: String,
    pub form_id: String,
    pub title: String,
    pub description: Option<String>,
    pub position: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSectionRequest {
    pub title: String,
    pub description: Option<String>,
    pub position: i32,
}

// ===== Questions =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuestionType {
    #[serde(rename = "likert")]
    Likert,
    #[serde(rename = "text")]
    Text,
    #[serde(rename = "textarea")]
    TextArea,
    #[serde(rename = "select")]
    Select,
    #[serde(rename = "multiselect")]
    MultiSelect,
    #[serde(rename = "number")]
    Number,
    #[serde(rename = "section_header")]
    SectionHeader,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Question {
    pub id: String,
    pub form_id: String,
    pub section_id: Option<String>,
    pub position: i32,
    #[serde(rename = "type")]
    pub question_type: String,
    pub title: String,
    pub description: Option<String>,
    pub features: JsonValue,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuestionRequest {
    pub section_id: Option<String>,
    pub position: i32,
    #[serde(rename = "type")]
    pub question_type: String,
    pub title: String,
    pub description: Option<String>,
    pub features: Option<JsonValue>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuestionRequest {
    pub section_id: Option<String>,
    pub position: Option<i32>,
    #[serde(rename = "type")]
    pub question_type: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub features: Option<JsonValue>,
}

// ===== Responses =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Response {
    pub id: String,
    pub form_id: String,
    pub respondent_name: Option<String>,
    pub respondent_email: Option<String>,
    pub submitted_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub metadata: JsonValue,
}

#[derive(Debug, Deserialize)]
pub struct SubmitFormRequest {
    pub respondent_name: Option<String>,
    pub respondent_email: Option<String>,
    pub answers: Vec<AnswerInput>,
}

#[derive(Debug, Deserialize)]
pub struct AnswerInput {
    pub question_id: String,
    pub value: JsonValue,
}

// ===== Answers =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Answer {
    pub id: String,
    pub response_id: String,
    pub question_id: String,
    pub value: JsonValue,
    pub created_at: DateTime<Utc>,
}

// ===== Form with related data =====

#[derive(Debug, Serialize)]
pub struct FormWithSections {
    #[serde(flatten)]
    pub form: Form,
    pub sections: Vec<SectionWithQuestions>,
}

#[derive(Debug, Serialize)]
pub struct SectionWithQuestions {
    #[serde(flatten)]
    pub section: Section,
    pub questions: Vec<Question>,
}

// ===== Statistics =====

#[derive(Debug, Serialize)]
pub struct FormStats {
    pub form_id: String,
    pub total_responses: i64,
    pub completion_rate: f64,
    pub average_time: Option<i64>,
    pub sections: Vec<SectionStats>,
}

#[derive(Debug, Serialize)]
pub struct SectionStats {
    pub section_id: String,
    pub section_title: String,
    pub questions: Vec<QuestionStats>,
}

#[derive(Debug, Serialize)]
pub struct QuestionStats {
    pub question_id: String,
    pub question_title: String,
    pub question_type: String,
    pub response_count: i64,
    pub stats: JsonValue, // Type-specific statistics
}

// ===== Response with answers =====

#[derive(Debug, Serialize)]
pub struct ResponseWithAnswers {
    #[serde(flatten)]
    pub response: Response,
    pub answers: Vec<AnswerWithQuestion>,
}

#[derive(Debug, Serialize)]
pub struct AnswerWithQuestion {
    #[serde(flatten)]
    pub answer: Answer,
    pub question: Question,
}

// ===== Export formats =====

#[derive(Debug, Serialize)]
pub struct ExportData {
    pub form: Form,
    pub responses: Vec<ResponseWithAnswers>,
    pub exported_at: DateTime<Utc>,
}

// ===== Validation =====

impl CreateFormRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.title.trim().is_empty() {
            return Err("Form title cannot be empty".to_string());
        }
        if let Some(status) = &self.status {
            if !["draft", "published", "archived"].contains(&status.as_str()) {
                return Err("Invalid form status".to_string());
            }
        }
        Ok(())
    }
}

impl CreateQuestionRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.title.trim().is_empty() {
            return Err("Question title cannot be empty".to_string());
        }
        
        let valid_types = ["likert", "text", "textarea", "select", "multiselect", "number", "section_header"];
        if !valid_types.contains(&self.question_type.as_str()) {
            return Err(format!("Invalid question type: {}", self.question_type));
        }
        
        if self.position < 0 {
            return Err("Position must be non-negative".to_string());
        }
        
        Ok(())
    }
}

impl SubmitFormRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.answers.is_empty() {
            return Err("No answers provided".to_string());
        }
        
        // Additional validation can be added here
        // For example, checking required questions are answered
        
        Ok(())
    }
}