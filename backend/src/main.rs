mod db;
mod email;
mod error;
mod handlers;
mod models;

use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};
use http::header::{self, HeaderValue};
use sqlx::SqlitePool;
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub admin_token: String,
    pub resend_api_key: String,
    pub notification_email: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Try to load from parent directory first (for local development), then current directory
    dotenvy::from_filename("../.env")
        .ok()
        .or_else(|| dotenvy::dotenv().ok());

    // Configure structured logging based on environment
    let is_production =
        std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) == "production";

    if is_production {
        // JSON output for production (better for log aggregation)
        tracing_subscriber::registry()
            .with(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "info".into()),
            )
            .with(
                tracing_subscriber::fmt::layer()
                    .json()
                    .with_target(true)
                    .with_current_span(true)
                    .with_file(false)
                    .with_line_number(false),
            )
            .init();
    } else {
        // Pretty output for development
        tracing_subscriber::registry()
            .with(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "info".into()),
            )
            .with(
                tracing_subscriber::fmt::layer()
                    .pretty()
                    .with_target(true)
                    .with_file(true)
                    .with_line_number(true),
            )
            .init();
    }

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let admin_token = std::env::var("ADMIN_TOKEN").expect("ADMIN_TOKEN must be set");
    let resend_api_key = std::env::var("RESEND_API_KEY").unwrap_or_else(|_| "".to_string());
    let notification_email = std::env::var("NOTIFICATION_EMAIL").unwrap_or_else(|_| "".to_string());
    let port: u16 = std::env::var("PORT")
        .expect("PORT must be set")
        .parse()
        .expect("PORT must be a valid number");

    // CORS allowed origins - comma-separated list
    let cors_origins =
        std::env::var("CORS_ALLOWED_ORIGINS").expect("CORS_ALLOWED_ORIGINS must be set");

    tracing::info!("Connecting to database: {}", database_url);
    let db = db::init_db(&database_url).await?;

    let app_state = AppState {
        db,
        admin_token,
        resend_api_key,
        notification_email,
    };

    // Build the full application with v2 routes
    let app = build_full_app(app_state, cors_origins);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_full_app(app_state: AppState, cors_origins: String) -> Router {
    // Use STATIC_DIR env var for production, default to ../frontend/dist for development
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let index_path = format!("{}/index.html", static_dir);

    let serve_dir = ServeDir::new(&static_dir).not_found_service(ServeFile::new(&index_path));

    // Build all routes
    Router::new()
        // Public routes
        .route("/api/forms", get(handlers::list_forms))
        .route("/api/forms/{form_id}", get(handlers::get_form))
        .route(
            "/api/forms/{form_id}/submit",
            post(handlers::submit_form_with_privacy),
        )
        .route(
            "/api/forms/{form_id}/check-submission",
            post(handlers::check_existing_submission),
        )
        .route(
            "/api/forms/{form_id}/stats",
            get(handlers::get_form_stats_anonymous),
        )
        .route("/api/template", get(handlers::get_form_template))
        // Admin routes (protected by auth)
        .route("/api/admin/stats", get(handlers::get_admin_stats))
        .route("/api/admin/responses", get(handlers::get_admin_responses))
        .route("/api/admin/import-form", post(handlers::import_form))
        .route("/api/admin/forms/{form_id}", put(handlers::update_form))
        .route("/api/admin/forms/{form_id}", delete(handlers::delete_form))
        .route(
            "/api/admin/forms/{form_id}/clone",
            post(handlers::clone_form),
        )
        .route(
            "/api/admin/forms/{form_id}/status",
            patch(handlers::update_form_status),
        )
        .route(
            "/api/admin/forms/{form_id}/responses",
            get(handlers::get_responses_with_pii),
        )
        .route(
            "/api/admin/forms/{form_id}/respondents",
            get(handlers::get_form_respondents),
        )
        .route(
            "/api/admin/respondents/{respondent_id}",
            delete(handlers::delete_respondent_pii),
        )
        .fallback_service(serve_dir)
        .layer({
            let mut cors = CorsLayer::new()
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers(Any);

            // Parse and add each origin from the environment variable
            for origin in cors_origins.split(',') {
                if let Ok(parsed_origin) = origin.trim().parse::<http::HeaderValue>() {
                    cors = cors.allow_origin(parsed_origin);
                }
            }

            cors
        })
        // Security headers - protect against XSS, clickjacking, and other attacks
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY")  // Prevent clickjacking
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff")  // Prevent MIME type sniffing
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_XSS_PROTECTION,
            HeaderValue::from_static("1; mode=block")  // XSS protection for older browsers
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin")  // Control referrer info
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static("default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; font-src 'self' data:")  // Basic CSP
        ))
        // Security middleware - applied to ALL routes
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024))  // 10MB max request size
        .layer(TimeoutLayer::new(Duration::from_secs(30)))     // 30 second timeout
        .layer(CompressionLayer::new())                        // Compress responses
        .layer(TraceLayer::new_for_http())
        .with_state(app_state)
}
