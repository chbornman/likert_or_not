export interface Question {
  id: number;
  question_text: string;
  is_required: boolean;
  allow_comment: boolean;
  position: number;
}

export interface FormData {
  title: string;
  description: string;
  questions: Question[];
}

export interface AnswerInput {
  question_id: number;
  likert_value: number | null;
  comment: string;
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
  question_text: string;
  average_score: number;
  response_count: number;
}

export interface Stats {
  total_responses: number;
  average_scores: QuestionAverage[];
  recent_responses: Response[];
}