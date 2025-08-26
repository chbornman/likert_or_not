use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use anyhow::Result;

pub async fn init_db(database_url: &str) -> Result<SqlitePool> {
    tracing::info!("Attempting to connect to database: {}", database_url);
    
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            e
        })?;

    tracing::info!("Database connection successful, running migrations...");
    
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Migration failed: {}", e);
            e
        })?;

    tracing::info!("Database migrations completed successfully");
    Ok(pool)
}