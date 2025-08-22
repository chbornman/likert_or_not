# Question Types Reference

This document describes all available question types in the Likert Form system.

## Text Input Types

### `text`
Single-line text input for short responses.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `placeholder`: String - Placeholder text
- `charLimit`: Number - Maximum character limit
- `helpText`: String - Additional help text

### `textarea`
Multi-line text input for longer responses.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `placeholder`: String - Placeholder text
- `charLimit`: Number - Maximum character limit
- `rows`: Number - Number of visible rows (default: 5)
- `helpText`: String - Additional help text

## Selection Types

### `multiple_choice`
Single selection from a list of options using radio buttons.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `options`: String[] - Array of option values
- `allowComment`: Boolean - Allow additional comments

### `checkbox`
Multiple selections from a list of options.

**Features:**
- `required`: Boolean - Whether at least one option must be selected
- `options`: String[] - Array of option values
- `allowComment`: Boolean - Allow additional comments

### `dropdown`
Single selection from a dropdown menu.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `options`: String[] - Array of option values
- `placeholder`: String - Placeholder text
- `allowComment`: Boolean - Allow additional comments

### `yes_no`
Binary yes/no question.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `allowComment`: Boolean - Allow additional comments

## Rating Types

### `likert`
Traditional Likert scale with labeled endpoints.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `scale`: Object
  - `min`: Number - Minimum value (typically 1)
  - `max`: Number - Maximum value (typically 5 or 7)
  - `minLabel`: String - Label for minimum value
  - `maxLabel`: String - Label for maximum value
- `allowComment`: Boolean - Allow additional comments

### `rating`
Star or numeric rating scale.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `min`: Number - Minimum rating value
- `max`: Number - Maximum rating value
- `ratingStyle`: 'stars' | 'numbers' - Visual style
- `allowComment`: Boolean - Allow additional comments

## Numeric Types

### `number`
Numeric input with validation.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `min`: Number - Minimum allowed value
- `max`: Number - Maximum allowed value
- `step`: Number - Step increment (e.g., 0.5, 1, 10)
- `placeholder`: String - Placeholder text

## Date/Time Types

### `date`
Date picker for selecting dates.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `min`: String - Minimum date (ISO format: "YYYY-MM-DD")
- `max`: String - Maximum date (ISO format: "YYYY-MM-DD")

### `time`
Time picker for selecting times.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `min`: String - Minimum time (format: "HH:MM")
- `max`: String - Maximum time (format: "HH:MM")

### `datetime`
Combined date and time picker.

**Features:**
- `required`: Boolean - Whether the question must be answered
- `min`: String - Minimum datetime (ISO format: "YYYY-MM-DDTHH:MM")
- `max`: String - Maximum datetime (ISO format: "YYYY-MM-DDTHH:MM")

## Special Types

### `section_header`
Non-interactive section header for organizing questions.

**Features:**
- `title`: String - Section title
- `description`: String - Optional section description

## Example Form Configuration

```json
{
  "title": "Employee Feedback Survey",
  "sections": [
    {
      "title": "Personal Information",
      "questions": [
        {
          "type": "text",
          "title": "Your Name",
          "features": {
            "required": true,
            "placeholder": "Enter your full name"
          }
        },
        {
          "type": "dropdown",
          "title": "Department",
          "features": {
            "required": true,
            "options": ["Engineering", "Sales", "Marketing", "HR"],
            "placeholder": "Select your department"
          }
        }
      ]
    },
    {
      "title": "Satisfaction",
      "questions": [
        {
          "type": "likert",
          "title": "I am satisfied with my work environment",
          "features": {
            "required": true,
            "scale": {
              "min": 1,
              "max": 5,
              "minLabel": "Strongly Disagree",
              "maxLabel": "Strongly Agree"
            }
          }
        },
        {
          "type": "rating",
          "title": "Rate your overall experience",
          "features": {
            "required": true,
            "min": 1,
            "max": 5,
            "ratingStyle": "stars"
          }
        }
      ]
    }
  ]
}
```

## Data Storage

All answer values are stored as JSON in the database, allowing flexible storage of different data types:

- Text inputs: Stored as strings
- Numbers: Stored as numbers
- Selections: Stored as strings (single) or arrays of strings (multiple)
- Dates/Times: Stored as ISO format strings
- Ratings: Stored as numbers
- Comments: Stored alongside the main value when enabled