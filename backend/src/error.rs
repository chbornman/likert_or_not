use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;
use tracing::{error, warn};

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("Internal server error")]
    InternalServerError,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Check if we're in production (don't expose details)
        let is_production =
            std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) == "production";

        let (status, error_message) = match self {
            AppError::Database(ref e) => {
                // Structured logging with all details for debugging
                error!(
                    error_type = "database",
                    error_details = ?e,
                    "Database operation failed"
                );

                let msg = if is_production {
                    "A database error occurred".to_string()
                } else {
                    format!("Database error: {}", e)
                };
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            AppError::DatabaseError(ref msg) => {
                error!(
                    error_type = "database_custom",
                    error_message = %msg,
                    "Custom database error"
                );

                let msg = if is_production {
                    "A database error occurred".to_string()
                } else {
                    msg.clone()
                };
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            AppError::Unauthorized(ref msg) => {
                warn!(
                    error_type = "unauthorized",
                    attempt = %msg,
                    "Unauthorized access attempt"
                );
                (StatusCode::UNAUTHORIZED, msg.clone())
            }
            AppError::BadRequest(ref msg) => {
                warn!(
                    error_type = "bad_request",
                    details = %msg,
                    "Bad request received"
                );
                (StatusCode::BAD_REQUEST, msg.clone())
            }
            AppError::NotFound(ref msg) => {
                warn!(
                    error_type = "not_found",
                    resource = %msg,
                    "Resource not found"
                );
                (StatusCode::NOT_FOUND, msg.clone())
            }
            AppError::ValidationError(ref msg) => {
                warn!(
                    error_type = "validation",
                    details = %msg,
                    "Validation failed"
                );
                (StatusCode::BAD_REQUEST, msg.clone())
            }
            AppError::InternalError(ref msg) => {
                error!(
                    error_type = "internal",
                    error_message = %msg,
                    "Internal server error"
                );

                let msg = if is_production {
                    "An internal error occurred".to_string()
                } else {
                    msg.clone()
                };
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            AppError::InternalServerError => {
                error!(
                    error_type = "internal_generic",
                    "Generic internal server error"
                );
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

#[allow(dead_code)]
pub type Result<T> = std::result::Result<T, AppError>;
