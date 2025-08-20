export interface Question {
  id: number;
  question_text: string;
  question_type?: 'likert' | 'text' | 'textarea';
  is_required: boolean;
  allow_comment: boolean;
  position: number;
  placeholder?: string;
  rows?: number;
  charLimit?: number;
}

export interface FormData {
  title: string;
  description: string;
  questions: Question[];
  settings?: any;
}

export interface AnswerInput {
  question_id: number;
  likert_value?: number | null;
  comment: string;
  text_value?: string;
}

export interface SubmissionRequest {
  respondent_name: string;
  respondent_email: string;
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