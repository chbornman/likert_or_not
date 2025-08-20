use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use anyhow::Result;

pub async fn init_db(database_url: &str) -> Result<SqlitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    seed_questions(&pool).await?;

    Ok(pool)
}

// Commented out for now - not needed for simple setup
// pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
//     Ok(())
// }

async fn seed_questions(pool: &SqlitePool) -> Result<()> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM questions")
        .fetch_one(pool)
        .await?;

    if count.0 == 0 {
        tracing::info!("Seeding Executive Director Performance Review questions...");
        
        let questions = vec![
            // Organizational Leadership
            ("The Executive Director effectively leads the organization toward achieving its strategic goals", true, true, 1),
            ("The ED demonstrates clear understanding of the Board's strategic objectives", true, true, 2),
            ("The ED successfully translates strategic direction into actionable results", true, true, 3),
            ("The ED maintains focus on organizational priorities throughout the review period", true, true, 4),
            
            // Strategic Planning & Management
            ("The ED demonstrates effective strategic thinking and planning", true, true, 5),
            ("The ED manages operations efficiently and effectively", true, true, 6),
            ("The ED balances strategic vision with practical management needs", true, true, 7),
            ("The ED inspires staff, volunteers, and community partners", true, true, 8),
            
            // Leadership & Governance
            ("The ED provides strong organizational leadership", true, true, 9),
            ("The ED works collaboratively with the Board of Directors", true, true, 10),
            ("The ED ensures proper governance practices are followed", true, true, 11),
            ("The ED communicates effectively with board members", true, true, 12),
            
            // Programming & Operations
            ("The ED oversees programs that align with organizational mission", true, true, 13),
            ("The ED ensures operational efficiency across all departments", true, true, 14),
            ("The ED enhances and improves existing programs and services", true, true, 15),
            ("The ED manages day-to-day operations effectively", true, true, 16),
            
            // Fundraising & Financial Management
            ("The ED ensures the financial health of the organization", true, true, 17),
            ("The ED successfully leads fundraising initiatives", true, true, 18),
            ("The ED demonstrates sound financial management practices", true, true, 19),
            ("The ED works to ensure organizational sustainability", true, true, 20),
            
            // Community Engagement & Advocacy
            ("The ED effectively represents the organization in the community", true, true, 21),
            ("The ED builds strong relationships with community partners", true, true, 22),
            ("The ED coordinates volunteer efforts successfully", true, true, 23),
            ("The ED advocates effectively for the organization's mission", true, true, 24),
            
            // Core Values
            ("The ED demonstrates persistence in pursuing organizational goals", true, true, 25),
            ("The ED shows commitment to continuous improvement", true, true, 26),
            ("The ED treats all stakeholders with decency and respect", true, true, 27),
            ("The ED demonstrates humility in leadership", true, true, 28),
            ("The ED acts with integrity in all professional dealings", true, true, 29),
            ("The ED shows deep understanding and commitment to TCW's mission", true, true, 30),
            
            // Executive Competencies
            ("The ED sets a clear and compelling vision for TCW's work", true, true, 31),
            ("The ED manages execution of plans and initiatives effectively", true, true, 32),
            ("The ED builds a strong and capable organization", true, true, 33),
            ("The ED excels at external communication and relationship-building", true, true, 34),
            ("The ED models the behaviors expected of all employees", true, true, 35),
            
            // Overall Performance
            ("The ED regularly exceeds performance expectations", true, true, 36),
            ("The ED's leadership positively impacts organizational success", true, true, 37),
            ("The ED effectively addresses areas needing improvement", true, true, 38),
            ("The ED achieves measurable results in key responsibility areas", true, true, 39),
            ("I am confident in the ED's ability to lead the organization forward", true, true, 40),
        ];

        for (text, required, comment, position) in questions {
            sqlx::query(
                "INSERT INTO questions (question_text, is_required, allow_comment, position) VALUES (?, ?, ?, ?)"
            )
            .bind(text)
            .bind(required)
            .bind(comment)
            .bind(position)
            .execute(pool)
            .await?;
        }

        tracing::info!("Seeded {} questions", 40);
    }

    Ok(())
}