# Form Configuration System

This directory contains form configuration templates and schemas for the Likert Form system.

## Directory Structure

```
config/
├── form-schema.json           # JSON Schema definition for form configurations
├── form-template.json         # Basic template with all available question types
├── templates/
│   ├── ed-review.json        # Executive Director Performance Review template
│   └── employee-satisfaction.json  # Employee Satisfaction Survey template
└── README.md                  # This file
```

## How to Use

### Creating a New Form from Template

1. Copy one of the templates from the `templates/` directory
2. Modify the following required fields:
   - `id`: Unique identifier for your form (lowercase, hyphens allowed)
   - `title`: Display title of the form
   - `sections`: At least one section with questions

3. Import the form using the Admin Dashboard:
   - Log in to the Admin Dashboard
   - Click "Import Form" button
   - Select your JSON configuration file
   - The form will be created and available immediately

### Form Configuration Structure

```json
{
  "id": "unique-form-id",
  "title": "Form Title",
  "description": "Optional description",
  "status": "published",  // Options: draft, published, archived
  "welcome_message": "Message shown at form start",
  "closing_message": "Message shown after completion",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "description": "Optional section description",
      "position": 1,
      "questions": [
        {
          "id": "question-id",
          "title": "Question text",
          "question_type": "likert",  // Options: likert, text, textarea, yes_no, multiple_choice
          "is_required": true,
          "position": 1,
          "help_text": "Optional help text",
          "options": ["Option 1", "Option 2"]  // Required for multiple_choice
        }
      ]
    }
  ]
}
```

### Question Types

- **likert**: 5-point Likert scale (Strongly Disagree to Strongly Agree)
- **text**: Single-line text input
- **textarea**: Multi-line text input
- **yes_no**: Yes/No selection
- **multiple_choice**: Custom options (requires `options` array)

### Validation

The form configuration is validated against `form-schema.json`. Requirements:
- `id` must be unique and contain only lowercase letters, numbers, and hyphens
- `title` is required
- At least one section with at least one question
- Valid question types
- Multiple choice questions must include options

### API Endpoint

Forms can also be imported programmatically:

```bash
curl -X POST http://localhost:3000/api/admin/import-form?token=YOUR_ADMIN_TOKEN \
  -H "Content-Type: application/json" \
  -d @your-form-config.json
```

## Example Templates

### Executive Director Review
- Comprehensive performance evaluation
- 9 sections covering leadership, management, and organizational impact
- Mix of Likert scale and text feedback questions

### Employee Satisfaction Survey
- 6 sections covering job satisfaction, management, and workplace culture
- Primarily Likert scale with optional comment fields
- Designed for anonymous feedback collection