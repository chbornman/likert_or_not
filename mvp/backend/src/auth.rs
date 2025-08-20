use async_trait::async_trait;
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode, header},
    response::{IntoResponse, Response},
    Json,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: i64,    // expiration time
    pub iat: i64,    // issued at
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: AuthUser,
    pub expires_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub token_expiry_hours: i64,
}

impl AuthConfig {
    pub fn from_env() -> Self {
        Self {
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| {
                    // In production, this should fail. For development, use a default
                    tracing::warn!("JWT_SECRET not set, using default. This is insecure!");
                    "change-this-secret-key-in-production".to_string()
                }),
            token_expiry_hours: std::env::var("TOKEN_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
        }
    }
}

pub async fn create_admin_user(
    pool: &SqlitePool,
    username: &str,
    password: &str,
    email: Option<&str>,
) -> Result<String, AppError> {
    let id = Uuid::new_v4().to_string();
    let password_hash = hash(password, DEFAULT_COST)
        .map_err(|e| AppError::InternalError(format!("Failed to hash password: {}", e)))?;

    sqlx::query!(
        r#"
        INSERT INTO admin_users (id, username, password_hash, email)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        id,
        username,
        password_hash,
        email
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(id)
}

pub async fn verify_login(
    pool: &SqlitePool,
    username: &str,
    password: &str,
) -> Result<AuthUser, AppError> {
    let user = sqlx::query!(
        r#"
        SELECT id, username, password_hash, email
        FROM admin_users
        WHERE username = ?1 AND is_active = 1
        "#,
        username
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::Unauthorized("Invalid credentials".to_string()))?;

    let is_valid = verify(password, &user.password_hash)
        .map_err(|e| AppError::InternalError(format!("Failed to verify password: {}", e)))?;

    if !is_valid {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    // Update last login
    sqlx::query!(
        r#"
        UPDATE admin_users
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = ?1
        "#,
        user.id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(AuthUser {
        id: user.id,
        username: user.username,
        email: user.email,
    })
}

pub fn create_token(user: &AuthUser, config: &AuthConfig) -> Result<(String, DateTime<Utc>), AppError> {
    let now = Utc::now();
    let expires_at = now + Duration::hours(config.token_expiry_hours);
    
    let claims = Claims {
        sub: user.id.clone(),
        exp: expires_at.timestamp(),
        iat: now.timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Failed to create token: {}", e)))?;

    Ok((token, expires_at))
}

pub async fn store_session(
    pool: &SqlitePool,
    user_id: &str,
    token: &str,
    expires_at: DateTime<Utc>,
) -> Result<(), AppError> {
    let id = Uuid::new_v4().to_string();
    let expires_at_str = expires_at.to_rfc3339();

    sqlx::query!(
        r#"
        INSERT INTO admin_sessions (id, user_id, token, expires_at)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        id,
        user_id,
        token,
        expires_at_str
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(())
}

pub async fn verify_session(pool: &SqlitePool, token: &str) -> Result<AuthUser, AppError> {
    // First check if session exists and is valid
    let session = sqlx::query!(
        r#"
        SELECT s.user_id, s.expires_at, u.username, u.email
        FROM admin_sessions s
        JOIN admin_users u ON s.user_id = u.id
        WHERE s.token = ?1 AND u.is_active = 1
        "#,
        token
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?
    .ok_or_else(|| AppError::Unauthorized("Invalid session".to_string()))?;

    // Check if session has expired
    let expires_at = DateTime::parse_from_rfc3339(&session.expires_at)
        .map_err(|e| AppError::InternalError(format!("Failed to parse expiry date: {}", e)))?
        .with_timezone(&Utc);

    if Utc::now() > expires_at {
        // Clean up expired session
        sqlx::query!(
            r#"DELETE FROM admin_sessions WHERE token = ?1"#,
            token
        )
        .execute(pool)
        .await
        .ok();
        
        return Err(AppError::Unauthorized("Session expired".to_string()));
    }

    Ok(AuthUser {
        id: session.user_id,
        username: session.username,
        email: session.email,
    })
}

pub async fn logout(pool: &SqlitePool, token: &str) -> Result<(), AppError> {
    sqlx::query!(
        r#"DELETE FROM admin_sessions WHERE token = ?1"#,
        token
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(())
}

// Cleanup expired sessions periodically
pub async fn cleanup_expired_sessions(pool: &SqlitePool) -> Result<u64, AppError> {
    let result = sqlx::query!(
        r#"
        DELETE FROM admin_sessions 
        WHERE datetime(expires_at) < datetime('now')
        "#
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(result.rows_affected())
}

// Axum extractor for protected routes
#[derive(Debug)]
pub struct RequireAuth {
    pub user: AuthUser,
}

#[async_trait]
impl<S> FromRequestParts<S> for RequireAuth
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract the token from the Authorization header
        let auth_header = parts.headers
            .get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| {
                (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                    "error": "Missing authorization header"
                }))).into_response()
            })?;

        // Parse Bearer token
        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| {
                (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                    "error": "Invalid authorization header format"
                }))).into_response()
            })?;

        // Get the pool from request extensions (set by the app state)
        let pool = parts.extensions.get::<SqlitePool>()
            .ok_or_else(|| {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "Database connection not available"
                }))).into_response()
            })?;

        // Verify the session
        let user = verify_session(pool, token)
            .await
            .map_err(|e| {
                (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                    "error": e.to_string()
                }))).into_response()
            })?;

        Ok(RequireAuth { user })
    }
}

// Audit logging
pub async fn log_action(
    pool: &SqlitePool,
    user_id: Option<&str>,
    action: &str,
    entity_type: Option<&str>,
    entity_id: Option<&str>,
    details: Option<serde_json::Value>,
    ip_address: Option<&str>,
) -> Result<(), AppError> {
    let details_str = details.map(|d| d.to_string());
    
    sqlx::query!(
        r#"
        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        user_id,
        action,
        entity_type,
        entity_id,
        details_str,
        ip_address
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok(())
}