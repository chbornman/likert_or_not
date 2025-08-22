mod models;
mod handlers;
mod db;
mod email;
mod error;

use axum::{
    Router,
    routing::{get, post, put, delete, patch},
};
use sqlx::SqlitePool;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};
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
    dotenvy::from_filename("../.env").ok()
        .or_else(|| dotenvy::dotenv().ok());

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://./likert_form.db?mode=rwc".to_string());
    let admin_token = std::env::var("ADMIN_TOKEN")
        .expect("ADMIN_TOKEN must be set");
    let resend_api_key = std::env::var("RESEND_API_KEY")
        .unwrap_or_else(|_| "".to_string());
    let notification_email = std::env::var("NOTIFICATION_EMAIL")
        .unwrap_or_else(|_| "".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .expect("PORT must be a valid number");

    tracing::info!("Connecting to database: {}", database_url);
    let db = db::init_db(&database_url).await?;

    let app_state = AppState {
        db,
        admin_token,
        resend_api_key,
        notification_email,
    };

    // Build the full application with v2 routes
    let app = build_full_app(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_full_app(app_state: AppState) -> Router {
    // Use STATIC_DIR env var for production, default to ../frontend/dist for development
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let index_path = format!("{}/index.html", static_dir);
    
    let serve_dir = ServeDir::new(&static_dir)
        .not_found_service(ServeFile::new(&index_path));

    // Build all routes including v2
    Router::new()
        // Public routes
        .route("/api/forms", get(handlers::list_forms))
        .route("/api/forms/{form_id}", get(handlers::get_form))
        .route("/api/forms/{form_id}/submit", post(handlers::submit_form_with_privacy))
        .route("/api/forms/{form_id}/stats", get(handlers::get_form_stats_anonymous))
        .route("/api/template", get(handlers::get_form_template))
        // Admin routes (requires auth)
        .route("/api/admin/stats", get(handlers::get_admin_stats))
        .route("/api/admin/responses", get(handlers::get_admin_responses))
        .route("/api/admin/import-form", post(handlers::import_form))
        .route("/api/admin/forms/{form_id}", put(handlers::update_form))
        .route("/api/admin/forms/{form_id}", delete(handlers::delete_form))
        .route("/api/admin/forms/{form_id}/clone", post(handlers::clone_form))
        .route("/api/admin/forms/{form_id}/status", patch(handlers::update_form_status))
        .route("/api/admin/forms/{form_id}/responses", get(handlers::get_responses_with_pii))
        .route("/api/admin/respondents/{respondent_id}", delete(handlers::delete_respondent_pii))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state)
}