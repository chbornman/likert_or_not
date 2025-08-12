use serde_json::json;

pub async fn send_notification(
    api_key: &str,
    to_email: &str,
    respondent_name: &str,
    respondent_email: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let body = json!({
        "from": "Likert Form <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "New Likert Form Response",
        "html": format!(
            r#"
            <h2>New Form Response Received</h2>
            <p>You have received a new response to your feedback form.</p>
            <ul>
                <li><strong>Respondent:</strong> {}</li>
                <li><strong>Email:</strong> {}</li>
                <li><strong>Submitted:</strong> {}</li>
            </ul>
            <p>Log in to your admin dashboard to view the full response.</p>
            "#,
            respondent_name,
            respondent_email,
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
        ),
    });

    let response = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Failed to send email: {}", error_text).into());
    }

    Ok(())
}