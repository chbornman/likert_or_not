use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;

// ===== Respondents (PII Storage) =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Respondent {
    pub id: String,
    pub name: String,
    pub email: String,
    pub email_hash: String,
    pub created_at: DateTime<Utc>,
}

// ===== Responses (Anonymous) =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Response {
    pub id: String,
    pub respondent_id: String,
    pub form_id: String,
    pub role: Option<String>,
    pub submitted_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub metadata: JsonValue,
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

// ===== Request/Response DTOs =====

#[derive(Debug, Deserialize)]
pub struct SubmitFormRequest {
    pub respondent_name: String,
    pub respondent_email: String,
    pub role: Option<String>,
    pub answers: Vec<AnswerInput>,
}

#[derive(Debug, Deserialize)]
pub struct AnswerInput {
    pub question_id: String,
    pub value: JsonValue,
}

// ===== Combined Views (for admin viewing) =====

#[derive(Debug, Serialize)]
pub struct ResponseWithPII {
    pub id: String,
    pub form_id: String,
    pub respondent_name: Option<String>,
    pub respondent_email: Option<String>,
    pub role: Option<String>,
    pub submitted_at: DateTime<Utc>,
    pub answers: Vec<AnswerWithQuestion>,
}

#[derive(Debug, Serialize)]
pub struct AnswerWithQuestion {
    pub question_id: String,
    pub question_title: String,
    pub value: JsonValue,
}

// ===== Anonymous Statistics (no PII) =====

#[derive(Debug, Serialize)]
pub struct AnonymousStats {
    pub form_id: String,
    pub total_responses: i64,
    pub role_distribution: Vec<RoleCount>,
    pub question_stats: Vec<QuestionStat>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct RoleCount {
    pub role: Option<String>,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct QuestionStat {
    pub question_id: String,
    pub question_title: String,
    pub response_count: i64,
    pub average_rating: Option<f64>,
    pub rating_distribution: Vec<RatingCount>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct RatingCount {
    pub rating: i32,
    pub count: i64,
}

// ===== Utility functions =====

impl SubmitFormRequest {
    pub fn validate(&self) -> Result<(), String> {
        // Validate name
        if self.respondent_name.trim().is_empty() {
            return Err("Name is required".to_string());
        }
        if self.respondent_name.len() > 255 {
            return Err("Name is too long (max 255 characters)".to_string());
        }
        // Check for suspicious patterns in name
        if self.respondent_name.contains('<')
            || self.respondent_name.contains('>')
            || self.respondent_name.contains("script")
            || self.respondent_name.contains("javascript:")
        {
            return Err("Invalid characters in name".to_string());
        }

        // Validate email
        if self.respondent_email.trim().is_empty() {
            return Err("Email is required".to_string());
        }
        if self.respondent_email.len() > 254 {
            return Err("Email is too long".to_string());
        }
        // Enhanced email validation
        let email = self.respondent_email.trim().to_lowercase();
        if !email.contains('@') || email.starts_with('@') || email.ends_with('@') {
            return Err("Invalid email address".to_string());
        }
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
            return Err("Invalid email address".to_string());
        }
        if !parts[1].contains('.') || parts[1].starts_with('.') || parts[1].ends_with('.') {
            return Err("Invalid email domain".to_string());
        }
        // Check for SQL injection attempts
        if email.contains(';')
            || email.contains("--")
            || email.contains("/*")
            || email.contains("*/")
            || email.contains("\\")
        {
            return Err("Invalid characters in email".to_string());
        }

        // Validate role if provided
        if let Some(role) = &self.role {
            if role.len() > 100 {
                return Err("Role is too long (max 100 characters)".to_string());
            }
            // Check for XSS attempts in role
            if role.contains('<') || role.contains('>') || role.contains("script") {
                return Err("Invalid characters in role".to_string());
            }
        }

        // Validate answers
        if self.answers.is_empty() {
            return Err("No answers provided".to_string());
        }

        // Validate each answer
        for answer in &self.answers {
            // Check if the value is a string and validate it
            if let serde_json::Value::String(text) = &answer.value {
                if text.len() > 10000 {
                    return Err("Answer text is too long (max 10000 characters)".to_string());
                }
                // Basic XSS prevention
                if text.contains("<script")
                    || text.contains("javascript:")
                    || text.contains("onerror=")
                    || text.contains("onclick=")
                {
                    return Err("Invalid content in answer".to_string());
                }
            }

            // Validate numeric values are within reasonable ranges
            if let serde_json::Value::Number(num) = &answer.value {
                if let Some(f) = num.as_f64() {
                    if f.is_nan() || f.is_infinite() {
                        return Err("Invalid numeric value".to_string());
                    }
                }
            }
        }

        Ok(())
    }

    /// Generate email hash for duplicate checking
    /// In production, use a proper cryptographic hash with salt
    pub fn email_hash(&self) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(self.respondent_email.to_lowercase().trim());
        hasher.update(b"likert-form-salt"); // Simple salt for now
        format!("{:x}", hasher.finalize())
    }
}
