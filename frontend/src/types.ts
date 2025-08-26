export interface Question {
  id: string;
  question_text: string;
  question_type?:
    | "likert"
    | "text"
    | "textarea"
    | "multiple_choice"
    | "checkbox"
    | "dropdown"
    | "yes_no"
    | "rating"
    | "number"
    | "date"
    | "time"
    | "datetime";
  is_required: boolean;
  allow_comment: boolean;
  position: number;
  help_text?: string;
  placeholder?: string;
  rows?: number;
  charLimit?: number;
  options?: string[]; // For multiple choice, checkbox, dropdown
  min?: number; // For number and rating types
  max?: number; // For number and rating types
  step?: number; // For number type
  ratingStyle?: "stars" | "numbers"; // For rating type
  dateFormat?: string; // For date/time types
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  position: number;
  questions: Question[];
}

export interface FormData {
  title: string;
  description?: string;
  instructions?: string;
  welcome_message?: string;
  closing_message?: string;
  sections: Section[];
  questions: Question[]; // Flattened for backward compatibility
  settings?: {
    estimatedTime?: string;
    confidentialityNotice?: string;
    reviewPeriod?: string;
    allowAnonymous?: boolean;
    requireEmail?: boolean;
  };
}

export interface AnswerInput {
  question_id: string;
  likert_value?: number | null;
  comment: string;
  text_value?: string;
  selected_options?: string[]; // For checkbox (multi-select)
  selected_option?: string; // For multiple choice, dropdown, yes/no
  number_value?: number; // For number and rating types
  date_value?: string; // For date/time types
}

export interface SubmissionRequest {
  respondent_name: string;
  respondent_email: string;
  role?: string;
  answers: AnswerInput[];
}

export interface Response {
  id: number;
  respondent_name: string;
  respondent_email: string;
  submitted_at: string;
  ip_address: string | null;
}

export interface AnswerWithQuestion {
  question_text: string;
  likert_value: number | null;
  comment: string | null;
}

export interface ResponseWithAnswers {
  response: Response;
  answers: AnswerWithQuestion[];
}

export interface QuestionAverage {
  question_id: number;
  question_text: string;
  position: number;
  average_score: number;
  response_count: number;
}

export interface QuestionWithComments {
  question_id: number;
  question_text: string;
  position: number;
  average_score: number;
  response_count: number;
  comments: string[];
}

export interface Stats {
  total_responses: number;
  average_scores: QuestionAverage[];
  questions_with_comments: QuestionWithComments[];
  recent_responses: Response[];
}
