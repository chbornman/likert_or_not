use serde::{Deserialize, Serialize};
use anyhow::Result;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct FormConfig {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub welcome_message: Option<String>,
    pub closing_message: Option<String>,
    pub sections: Vec<SectionConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SectionConfig {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub position: i32,
    pub questions: Vec<QuestionConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestionConfig {
    pub id: String,
    pub title: String,
    pub question_type: String,
    pub is_required: Option<bool>,
    pub position: i32,
    pub help_text: Option<String>,
    pub options: Option<Vec<String>>,
}

impl FormConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: FormConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn validate(&self) -> Result<()> {
        if self.id.is_empty() {
            anyhow::bail!("Form ID cannot be empty");
        }
        if self.title.is_empty() {
            anyhow::bail!("Form title cannot be empty");
        }
        if self.sections.is_empty() {
            anyhow::bail!("Form must have at least one section");
        }

        for section in &self.sections {
            if section.questions.is_empty() {
                anyhow::bail!("Section '{}' must have at least one question", section.title);
            }
            
            for question in &section.questions {
                match question.question_type.as_str() {
                    "likert" | "text" | "textarea" | "yes_no" | "multiple_choice" => {},
                    _ => anyhow::bail!("Invalid question type: {}", question.question_type),
                }
                
                if question.question_type == "multiple_choice" && question.options.is_none() {
                    anyhow::bail!("Multiple choice question '{}' must have options", question.title);
                }
            }
        }

        Ok(())
    }
}

pub async fn import_form_config(
    pool: &sqlx::SqlitePool,
    config: FormConfig,
) -> Result<String> {
    config.validate()?;

    let mut tx = pool.begin().await?;

    // Check if form with this ID already exists
    let exists: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM forms WHERE id = ?"
    )
    .bind(&config.id)
    .fetch_one(&mut *tx)
    .await?;

    if exists.0 > 0 {
        anyhow::bail!("Form with ID '{}' already exists", config.id);
    }

    // Insert the form
    sqlx::query(
        "INSERT INTO forms (id, title, description, status, welcome_message, closing_message, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&config.id)
    .bind(&config.title)
    .bind(&config.description)
    .bind(config.status.as_deref().unwrap_or("published"))
    .bind(&config.welcome_message)
    .bind(&config.closing_message)
    .execute(&mut *tx)
    .await?;

    // Insert sections and questions
    for section in config.sections {
        let section_uuid = uuid::Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO sections (id, form_id, title, description, position, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind(&section_uuid)
        .bind(&config.id)
        .bind(&section.title)
        .bind(&section.description)
        .bind(section.position)
        .execute(&mut *tx)
        .await?;

        for question in section.questions {
            let question_uuid = uuid::Uuid::new_v4().to_string();
            
            sqlx::query(
                "INSERT INTO form_questions (id, section_id, title, question_type, is_required, position, help_text, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
            )
            .bind(&question_uuid)
            .bind(&section_uuid)
            .bind(&question.title)
            .bind(&question.question_type)
            .bind(question.is_required.unwrap_or(false))
            .bind(question.position)
            .bind(&question.help_text)
            .execute(&mut *tx)
            .await?;

            // If it's a multiple choice question, insert options
            if question.question_type == "multiple_choice" {
                if let Some(options) = question.options {
                    for (idx, option) in options.iter().enumerate() {
                        sqlx::query(
                            "INSERT INTO question_options (id, question_id, option_text, position) 
                             VALUES (?, ?, ?, ?)"
                        )
                        .bind(uuid::Uuid::new_v4().to_string())
                        .bind(&question_uuid)
                        .bind(option)
                        .bind(idx as i32 + 1)
                        .execute(&mut *tx)
                        .await?;
                    }
                }
            }
        }
    }

    tx.commit().await?;

    Ok(config.id)
}