use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("Internal server error")]
    InternalServerError,
    
    #[error("Email error: {0}")]
    Email(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error occurred")
            }
            AppError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized access")
            }
            AppError::BadRequest(ref msg) => {
                (StatusCode::BAD_REQUEST, msg.as_str())
            }
            AppError::InternalServerError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AppError::Email(ref msg) => {
                tracing::error!("Email error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send notification")
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;