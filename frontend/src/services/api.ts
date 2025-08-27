// API Service Layer for v2 endpoints

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "";

// Types matching backend models
export interface Form {
  id: string;
  title: string;
  description?: string;
  status: string;
  settings: FormSettings;
  created_at: string;
  updated_at: string;
}

export interface FormSettings {
  reviewPeriod?: string;
  confidentialityNotice?: string;
  jobDescription?: string;
  allowAnonymous?: boolean;
  requireAuth?: boolean;
  autoSave?: boolean;
  progressBar?: boolean;
  estimatedTime?: string;
}

export interface Section {
  id: string;
  form_id: string;
  title: string;
  description?: string;
  position: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  form_id: string;
  section_id?: string;
  position: number;
  type: QuestionType;
  title: string;
  description?: string;
  features: QuestionFeatures;
}

export type QuestionType =
  | "likert"
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "section_header"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  | "yes_no"
  | "rating"
  | "date"
  | "time"
  | "datetime";

export interface QuestionFeatures {
  required?: boolean;
  allowComment?: boolean;
  allowNA?: boolean;
  charLimit?: number;
  minValue?: number;
  maxValue?: number;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  rows?: number;
  scale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  min?: number | string; // For number, rating, date/time types
  max?: number | string; // For number, rating, date/time types
  step?: number; // For number type
  ratingStyle?: "stars" | "numbers"; // For rating type
  dateFormat?: string; // For date/time types
}

export interface FormWithSections {
  id: string;
  title: string;
  description?: string;
  status: string;
  settings: FormSettings;
  sections: Section[];
}

export interface FormResponse {
  respondent_name?: string;
  respondent_email?: string;
  answers: Answer[];
}

export interface Answer {
  question_id: string;
  value: any;
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  expires_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
}

// Admin API helper with secure token handling
export class AdminApiClient {
  private adminToken: string;

  constructor(token: string) {
    this.adminToken = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      // Security: Token in header, not URL!
      Authorization: `Bearer ${this.adminToken}`,
      ...(options.headers || {}),
    };

    const response = await fetch(path, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid admin token");
      }
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // Admin-specific methods
  async getStats(formId?: string) {
    const path = formId
      ? `/api/admin/stats?form_id=${formId}`
      : `/api/admin/stats`;
    return this.request(path);
  }

  async getResponses(formId?: string) {
    const path = formId
      ? `/api/admin/responses?form_id=${formId}`
      : `/api/admin/responses`;
    return this.request(path);
  }

  async importForm(formData: any) {
    return this.request("/api/admin/import-form", {
      method: "POST",
      body: JSON.stringify(formData),
    });
  }

  async updateFormStatus(formId: string, status: string) {
    return this.request(`/api/admin/forms/${formId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async deleteForm(formId: string) {
    return this.request(`/api/admin/forms/${formId}`, {
      method: "DELETE",
    });
  }

  async cloneForm(formId: string) {
    return this.request(`/api/admin/forms/${formId}/clone`, {
      method: "POST",
    });
  }
}

// API Client class
class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage if available
    if (typeof localStorage !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    this.token = response.token;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } finally {
      this.token = null;
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("auth_token");
      }
    }
  }

  async verifyAuth(): Promise<AuthUser> {
    return this.request<AuthUser>("/api/auth/verify");
  }

  // Form methods
  async listForms(): Promise<Form[]> {
    return this.request<Form[]>("/api/forms");
  }

  async getForm(formId: string): Promise<FormWithSections> {
    return this.request<FormWithSections>(`/api/forms/${formId}`);
  }

  async submitForm(
    formId: string,
    response: FormResponse,
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/api/forms/${formId}/submit`, {
      method: "POST",
      body: JSON.stringify(response),
    });
  }

  // Admin methods
  async createForm(form: Partial<Form>): Promise<Form> {
    return this.request<Form>("/api/admin/forms", {
      method: "POST",
      body: JSON.stringify(form),
    });
  }

  async updateForm(formId: string, updates: Partial<Form>): Promise<void> {
    await this.request(`/api/admin/forms/${formId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteForm(formId: string): Promise<void> {
    await this.request(`/api/admin/forms/${formId}`, {
      method: "DELETE",
    });
  }

  async getFormResponses(formId: string): Promise<any[]> {
    return this.request<any[]>(`/api/admin/forms/${formId}/responses`);
  }

  async getFormStats(formId: string): Promise<any> {
    return this.request<any>(`/api/forms/${formId}/stats`);
  }

  async exportFormData(formId: string, format: string = "csv"): Promise<any> {
    return this.request<any>(
      `/api/admin/forms/${formId}/export?format=${format}`,
    );
  }

  // Legacy endpoints (for backward compatibility)
  async getLegacyForm(): Promise<any> {
    return this.request<any>("/api/form");
  }

  async submitLegacyForm(data: any): Promise<any> {
    return this.request<any>("/api/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export as 'api' for backward compatibility with tests
export const api = {
  getForms: () => apiClient.listForms(),
  getForm: (id: string) => apiClient.getForm(id),
  createForm: (form: any) => apiClient.createForm(form),
  submitFormResponse: (formId: string, responses: any) =>
    apiClient.submitForm(formId, {
      answers: Object.entries(responses).map(([key, value]) => ({
        question_id: key,
        value,
      })),
    }),
};

// Helper function to check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("auth_token") !== null;
}

// Helper function to require authentication
export function requireAuth(): void {
  if (!isAuthenticated()) {
    window.location.href = "/admin/login";
  }
}
