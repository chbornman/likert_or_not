import { Form, Question } from "../../src/types";

export const mockQuestions: Question[] = [
  {
    id: "q1",
    type: "likert",
    text: "How satisfied are you with our service?",
    required: true,
    scale_labels: {
      "1": "Strongly Disagree",
      "2": "Disagree", 
      "3": "Neutral",
      "4": "Agree",
      "5": "Strongly Agree"
    }
  },
  {
    id: "q2",
    type: "text",
    text: "What is your name?",
    required: true,
    placeholder: "Enter your name"
  },
  {
    id: "q3",
    type: "textarea",
    text: "Please provide additional feedback",
    required: false,
    placeholder: "Your feedback..."
  },
  {
    id: "q4",
    type: "yes_no",
    text: "Would you recommend us to others?",
    required: true
  },
  {
    id: "q5",
    type: "multiple_choice",
    text: "Select your age group",
    required: true,
    options: ["18-25", "26-35", "36-45", "46-55", "56+"]
  },
  {
    id: "q6",
    type: "checkbox",
    text: "Select all that apply",
    required: false,
    options: ["Option A", "Option B", "Option C", "Option D"]
  },
  {
    id: "q7",
    type: "dropdown",
    text: "Select your country",
    required: true,
    options: ["USA", "Canada", "UK", "Australia", "Other"]
  },
  {
    id: "q8",
    type: "number",
    text: "How many years of experience do you have?",
    required: true,
    min: 0,
    max: 50
  },
  {
    id: "q9",
    type: "rating",
    text: "Rate our service",
    required: true,
    max_rating: 10
  },
  {
    id: "q10",
    type: "datetime",
    text: "Select your preferred appointment date and time",
    required: true
  }
];

export const mockForm: Form = {
  id: "test-form-1",
  title: "Customer Satisfaction Survey",
  description: "Help us improve our service by providing your feedback",
  questions: mockQuestions,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_active: true,
  success_message: "Thank you for your feedback!",
  success_redirect_url: null,
  requires_auth: false
};

export const mockFormList: Form[] = [
  mockForm,
  {
    id: "test-form-2",
    title: "Employee Feedback Form",
    description: "Annual employee satisfaction survey",
    questions: mockQuestions.slice(0, 5),
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_active: true,
    success_message: "Thank you for your participation!",
    success_redirect_url: null,
    requires_auth: true
  },
  {
    id: "test-form-3",
    title: "Product Review",
    description: "Share your thoughts about our latest product",
    questions: mockQuestions.slice(0, 3),
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
    is_active: false,
    success_message: "Thanks for your review!",
    success_redirect_url: "https://example.com/thank-you",
    requires_auth: false
  }
];

export const mockResponses = {
  form_id: "test-form-1",
  responses: [
    {
      id: "response-1",
      submitted_at: "2024-01-10T10:00:00Z",
      answers: {
        q1: "4",
        q2: "John Doe",
        q3: "Great service, very satisfied!",
        q4: "yes",
        q5: "26-35",
        q6: ["Option A", "Option C"],
        q7: "USA",
        q8: "5",
        q9: "8",
        q10: "2024-02-01T14:00:00Z"
      }
    },
    {
      id: "response-2",
      submitted_at: "2024-01-10T11:00:00Z",
      answers: {
        q1: "5",
        q2: "Jane Smith",
        q3: "Excellent experience",
        q4: "yes",
        q5: "36-45",
        q6: ["Option B", "Option D"],
        q7: "Canada",
        q8: "10",
        q9: "9",
        q10: "2024-02-02T15:00:00Z"
      }
    },
    {
      id: "response-3",
      submitted_at: "2024-01-10T12:00:00Z",
      answers: {
        q1: "3",
        q2: "Bob Johnson",
        q3: "",
        q4: "no",
        q5: "18-25",
        q6: ["Option A"],
        q7: "UK",
        q8: "2",
        q9: "6",
        q10: "2024-02-03T10:00:00Z"
      }
    }
  ],
  total_responses: 3,
  summary: {
    q1: { average: 4, distribution: { "3": 1, "4": 1, "5": 1 } },
    q4: { yes: 2, no: 1 },
    q5: { distribution: { "18-25": 1, "26-35": 1, "36-45": 1 } },
    q8: { average: 5.67, min: 2, max: 10 },
    q9: { average: 7.67, min: 6, max: 9 }
  }
};