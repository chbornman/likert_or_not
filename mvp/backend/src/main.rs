mod models;
mod models_v2;
mod handlers;
mod handlers_v2_simple;
mod db;
mod email;
mod error;
mod config;

use axum::{
    Router,
    routing::{get, post, put, delete},
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
    
    // Run migrations for v2 tables
    if let Err(e) = run_v2_migrations(&db).await {
        tracing::warn!("Failed to run v2 migrations: {}", e);
    }

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

async fn run_v2_migrations(pool: &SqlitePool) -> anyhow::Result<()> {
    // Create v2 tables if they don't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS forms (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'draft',
            settings TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            form_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            position INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS questions_v2 (
            id TEXT PRIMARY KEY,
            form_id TEXT NOT NULL,
            section_id TEXT,
            position INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            features TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
            FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS responses_v2 (
            id TEXT PRIMARY KEY,
            form_id TEXT NOT NULL,
            respondent_name TEXT,
            respondent_email TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            metadata TEXT DEFAULT '{}',
            FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS answers_v2 (
            id TEXT PRIMARY KEY,
            response_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (response_id) REFERENCES responses_v2(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES questions_v2(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(pool)
    .await?;

    tracing::info!("V2 database schema initialized successfully");
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
        // Legacy API routes
        .route("/api/form", get(handlers::get_form))
        .route("/api/submit", post(handlers::submit_response))
        .route("/api/admin/responses", get(handlers::get_responses))
        .route("/api/admin/export", get(handlers::export_csv))
        .route("/api/admin/stats", get(handlers::get_stats))
        // V2 public routes
        .route("/api/v2/forms", get(handlers_v2_simple::list_forms))
        .route("/api/v2/forms/{form_id}", get(handlers_v2_simple::get_form))
        .route("/api/v2/forms/{form_id}/submit", post(handlers_v2_simple::submit_form))
        // V2 admin routes (protected by RequireAuth in handlers)
        .route("/api/admin/import-form", post(handlers::import_form_config))
        .route("/api/v2/admin/forms", post(handlers_v2_simple::create_form))
        .route("/api/v2/admin/forms/{form_id}", put(handlers_v2_simple::update_form).delete(handlers_v2_simple::delete_form))
        .route("/api/v2/admin/forms/{form_id}/responses", get(handlers_v2_simple::list_responses))
        .route("/api/v2/admin/forms/{form_id}/responses/{response_id}", get(handlers_v2_simple::get_response))
        .route("/api/v2/admin/forms/{form_id}/stats", get(handlers_v2_simple::get_form_stats))
        .route("/api/v2/admin/forms/{form_id}/export", get(handlers_v2_simple::export_form_data))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state)
}