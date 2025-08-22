# API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Frontend proxy: `http://localhost:5173/api`

## Authentication
Admin endpoints require a token passed as a query parameter. The token is set via the `ADMIN_TOKEN` environment variable.

---

## Public Endpoints

### List Forms
**GET** `/api/forms`

Returns all published forms.

**Response:**
```json
[
  {
    "id": "form-id",
    "title": "Form Title",
    "description": "Form description",
    "instructions": "Form instructions",
    "status": "published",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Form Details
**GET** `/api/forms/{form_id}`

Returns a specific form with all sections and questions.

**Response:**
```json
{
  "id": "form-id",
  "title": "Form Title",
  "description": "Form description",
  "welcome_message": "Welcome message",
  "closing_message": "Thank you message",
  "settings": {
    "allowAnonymous": true,
    "requireEmail": false,
    "estimatedTime": "15-20 minutes"
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "description": "Section description",
      "position": 1,
      "questions": [
        {
          "id": "q1",
          "type": "likert",
          "title": "Question text",
          "description": "Help text",
          "position": 1,
          "features": {
            "required": true,
            "allowComment": true
          }
        },
        {
          "id": "q2",
          "type": "text",
          "title": "Text question",
          "position": 2,
          "features": {
            "required": false,
            "placeholder": "Enter text",
            "charLimit": 500
          }
        },
        {
          "id": "q3",
          "type": "textarea",
          "title": "Long text question",
          "position": 3,
          "features": {
            "required": false,
            "rows": 5,
            "charLimit": 2000
          }
        }
      ]
    }
  ]
}
```

### Submit Form Response
**POST** `/api/forms/{form_id}/submit`

Submit a response to a form.

**Request Body:**
```json
{
  "respondent_name": "John Doe",
  "respondent_email": "john@example.com",
  "answers": [
    {
      "question_id": "q1",
      "value": 4
    },
    {
      "question_id": "q1",
      "value": {
        "rating": 4,
        "comment": "Additional comment"
      }
    },
    {
      "question_id": "q2",
      "value": "Text answer"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Response submitted successfully",
  "response_id": "uuid"
}
```

### Get Form Statistics (Anonymous)
**GET** `/api/forms/{form_id}/stats`

Returns anonymous statistics for a form.

**Response:**
```json
{
  "total_responses": 42,
  "completed_responses": 35,
  "in_progress_responses": 7,
  "recent_responses": [
    {
      "submitted_at": "2024-01-01T12:00:00Z",
      "completed": true
    }
  ],
  "question_stats": {
    "q1": {
      "type": "likert",
      "response_count": 42,
      "average": 4.2,
      "distribution": {
        "1": 2,
        "2": 5,
        "3": 8,
        "4": 15,
        "5": 12
      }
    },
    "q2": {
      "type": "text",
      "response_count": 38
    }
  }
}
```

---

## Admin Endpoints

All admin endpoints require authentication via the `token` query parameter.

### Import Form
**POST** `/api/admin/import-form?token={admin_token}`

Import a form configuration from JSON.

**Request Body:**
```json
{
  "id": "form-id",
  "title": "Form Title",
  "description": "Form description",
  "welcome_message": "Welcome message",
  "closing_message": "Thank you message",
  "status": "published",
  "settings": {
    "allowAnonymous": true,
    "requireEmail": false
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "description": "Section description",
      "position": 1,
      "questions": [
        {
          "id": "q1",
          "title": "Question text",
          "question_type": "likert",
          "is_required": true,
          "allow_comment": true,
          "help_text": "Additional help",
          "position": 1
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "message": "Form imported successfully",
  "form_id": "form-id",
  "title": "Form Title"
}
```

### Get Admin Statistics
**GET** `/api/admin/stats?token={admin_token}&form_id={form_id}`

Returns detailed statistics for a specific form (admin view).

**Response:**
Same as `/api/forms/{form_id}/stats`

### Get Form Responses (with PII)
**GET** `/api/admin/responses?token={admin_token}&form_id={form_id}`

Returns all responses for a form including personally identifiable information.

**Response:**
```json
[
  {
    "id": "response-id",
    "form_id": "form-id",
    "respondent_name": "John Doe",
    "respondent_email": "john@example.com",
    "role": "participant",
    "submitted_at": "2024-01-01T12:00:00Z",
    "completed": true,
    "answers": {
      "q1": {
        "question": "Question text",
        "likert_value": 4,
        "comment": "Additional comment"
      },
      "q2": {
        "question": "Text question",
        "text_value": "Text answer"
      }
    }
  }
]
```

### Get Form Responses (Alternative Path)
**GET** `/api/admin/forms/{form_id}/responses`

Alternative endpoint for getting form responses with PII. Currently does not require authentication (should be added in production).

### Update Form
**PUT** `/api/admin/forms/{form_id}?token={admin_token}`

Update an existing form configuration. This replaces all sections and questions.

**Request Body:**
```json
{
  "title": "Updated Form Title",
  "description": "Updated description",
  "welcome_message": "Updated welcome message",
  "closing_message": "Updated closing message",
  "status": "draft|published|archived",
  "settings": {
    "allowAnonymous": true,
    "requireEmail": false
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "description": "Section description",
      "position": 1,
      "questions": [
        {
          "id": "q1",
          "title": "Question text",
          "question_type": "likert",
          "is_required": true,
          "allow_comment": true,
          "help_text": "Help text",
          "position": 1,
          "placeholder": "For text inputs",
          "charLimit": 500,
          "rows": 5
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "message": "Form updated successfully",
  "form_id": "form-id"
}
```

### Clone Form
**POST** `/api/admin/forms/{form_id}/clone?token={admin_token}`

Create a copy of an existing form with a new ID. The cloned form will be created in draft status.

**Response:**
```json
{
  "message": "Form cloned successfully",
  "form_id": "new-form-id",
  "title": "Original Title (Copy)"
}
```

### Update Form Status
**PATCH** `/api/admin/forms/{form_id}/status?token={admin_token}`

Update the status of a form (draft, published, or archived).

**Request Body:**
```json
{
  "status": "published"
}
```

**Response:**
```json
{
  "message": "Form status updated to published",
  "form_id": "form-id",
  "status": "published"
}
```

### Delete Form
**DELETE** `/api/admin/forms/{form_id}?token={admin_token}`

Delete a form. Only forms without responses can be deleted.

**Response:**
```json
{
  "message": "Form deleted successfully"
}
```

**Error Response (if form has responses):**
```json
{
  "error": "Cannot delete form with existing responses"
}
```

### Delete Respondent PII
**DELETE** `/api/admin/respondents/{respondent_id}?token={admin_token}`

Delete personally identifiable information for a specific respondent while preserving their anonymous responses.

**Response:**
```json
{
  "message": "PII deleted successfully"
}
```

---

## Admin Features

### Form Management
- **Create**: Create new forms from scratch or templates
- **Edit**: Modify form structure, questions, and settings
- **Status Management**: Toggle between draft, published, and archived states
- **Export**: Download forms as JSON for backup or sharing
- **Import**: Upload JSON form configurations
- **Delete**: Remove forms (only if no responses exist)

### Dashboard Organization
- **Status Tabs**: Forms organized by draft, published, and archived status
- **Quick Actions**: Export to Excel, Export to JSON, Edit, Clone, Delete
- **Response Tracking**: View response counts and last submission dates

## Data Models

### Question Types
- `likert`: 5-point Likert scale (1-5)
- `text`: Single-line text input
- `textarea`: Multi-line text input

### Form Status
- `draft`: Form is being edited, not visible to users
- `published`: Form is available for responses
- `archived`: Form is no longer accepting responses

### Response Structure
- Responses are stored with a separate `respondents` table for PII
- Anonymous responses link to a respondent_id
- Answers are stored as JSON values that can be either:
  - Simple value (number for Likert, string for text)
  - Object with rating and comment for Likert with comments

---

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid or missing admin token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "Error message description"
}
```

---

## Database Schema

### Tables
- `forms`: Form definitions
- `sections`: Form sections
- `questions`: Questions within sections
- `responses`: Response metadata
- `respondents`: PII data (separate for privacy)
- `answers`: Individual question answers

### Privacy Design
- PII is stored separately in the `respondents` table
- Responses can be anonymized by deleting respondent records
- Admin endpoints are the only way to access PII
- Public statistics endpoints only return aggregate data