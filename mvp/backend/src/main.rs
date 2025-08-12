mod models;
mod handlers;
mod db;
mod email;
mod error;

use axum::{
    Router,
    routing::{get, post},
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
    dotenvy::dotenv().ok();

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

    let api_routes = Router::new()
        .route("/form", get(handlers::get_form))
        .route("/submit", post(handlers::submit_response))
        .route("/admin/responses", get(handlers::get_responses))
        .route("/admin/export", get(handlers::export_csv))
        .route("/admin/stats", get(handlers::get_stats));

    // Use STATIC_DIR env var for production, default to ../frontend/dist for development
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let index_path = format!("{}/index.html", static_dir);
    
    let serve_dir = ServeDir::new(&static_dir)
        .not_found_service(ServeFile::new(&index_path));

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

