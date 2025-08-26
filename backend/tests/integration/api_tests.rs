use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::json;
use sqlx::SqlitePool;
use tower::ServiceExt;

#[sqlx::test]
async fn test_create_form(pool: SqlitePool) {
    let app = create_test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/forms")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "title": "Test Survey",
                        "description": "A test survey",
                        "questions": [
                            {
                                "type": "likert",
                                "text": "How satisfied are you?",
                                "required": true,
                                "scale_labels": {
                                    "1": "Very Dissatisfied",
                                    "2": "Dissatisfied",
                                    "3": "Neutral",
                                    "4": "Satisfied",
                                    "5": "Very Satisfied"
                                }
                            }
                        ]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[sqlx::test]
async fn test_get_form(pool: SqlitePool) {
    let app = create_test_app(pool.clone()).await;
    
    let form_id = create_test_form(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(&format!("/api/forms/{}", form_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[sqlx::test]
async fn test_submit_response(pool: SqlitePool) {
    let app = create_test_app(pool.clone()).await;
    
    let form_id = create_test_form(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(&format!("/api/forms/{}/responses", form_id))
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "responses": {
                            "q1": "4",
                            "q2": "Test response"
                        }
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[sqlx::test]
async fn test_get_responses(pool: SqlitePool) {
    let app = create_test_app(pool.clone()).await;
    
    let form_id = create_test_form(&pool).await;
    submit_test_responses(&pool, &form_id, 5).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(&format!("/api/forms/{}/responses", form_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    
    let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(json["total_responses"], 5);
}

#[sqlx::test]
async fn test_form_validation(pool: SqlitePool) {
    let app = create_test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/forms")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "title": "",
                        "questions": []
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test]
async fn test_concurrent_submissions(pool: SqlitePool) {
    let form_id = create_test_form(&pool).await;
    
    let mut handles = vec![];
    
    for i in 0..10 {
        let pool_clone = pool.clone();
        let form_id_clone = form_id.clone();
        
        let handle = tokio::spawn(async move {
            let app = create_test_app(pool_clone).await;
            
            app.oneshot(
                Request::builder()
                    .method("POST")
                    .uri(&format!("/api/forms/{}/responses", form_id_clone))
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "responses": {
                                "q1": format!("{}", (i % 5) + 1),
                                "q2": format!("Response {}", i)
                            }
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
        });
        
        handles.push(handle);
    }
    
    for handle in handles {
        let response = handle.await.unwrap().unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
    
    let response_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM responses WHERE form_id = ?"
    )
    .bind(&form_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    
    assert_eq!(response_count, 10);
}

async fn create_test_app(pool: SqlitePool) -> axum::Router {
    use crate::{create_app, AppState};
    use std::sync::Arc;
    
    let state = Arc::new(AppState {
        db: pool,
        admin_password_hash: "$2b$12$test_hash".to_string(),
    });
    
    create_app(state)
}

async fn create_test_form(pool: &SqlitePool) -> String {
    let form_id = uuid::Uuid::new_v4().to_string();
    
    sqlx::query(
        "INSERT INTO forms (id, title, description, questions, created_at, updated_at) 
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&form_id)
    .bind("Test Form")
    .bind("Test Description")
    .bind(json!([
        {
            "id": "q1",
            "type": "likert",
            "text": "Test question",
            "required": true
        },
        {
            "id": "q2",
            "type": "text",
            "text": "Text question",
            "required": false
        }
    ]).to_string())
    .execute(pool)
    .await
    .unwrap();
    
    form_id
}

async fn submit_test_responses(pool: &SqlitePool, form_id: &str, count: usize) {
    for i in 0..count {
        let response_id = uuid::Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO responses (id, form_id, data, submitted_at) 
             VALUES (?, ?, ?, datetime('now'))"
        )
        .bind(&response_id)
        .bind(form_id)
        .bind(json!({
            "q1": format!("{}", (i % 5) + 1),
            "q2": format!("Response {}", i)
        }).to_string())
        .execute(pool)
        .await
        .unwrap();
    }
}