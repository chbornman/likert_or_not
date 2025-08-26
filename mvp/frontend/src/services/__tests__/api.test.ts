import { expect, test, describe, beforeEach, mock } from "bun:test";
import { api } from "../api";

describe("API Service", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = mock((url: string, options?: any) => {
      if (url.includes("/api/forms") && options?.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: "1", title: "Form 1", created_at: "2024-01-01" },
            { id: "2", title: "Form 2", created_at: "2024-01-02" }
          ])
        });
      }
      
      if (url.includes("/api/forms") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            id: "new-form-id",
            title: JSON.parse(options.body).title 
          })
        });
      }
      
      if (url.includes("/responses")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" })
      });
    });
    
    global.fetch = mockFetch;
  });

  describe("getForms", () => {
    test("should fetch all forms", async () => {
      const forms = await api.getForms();
      
      expect(forms).toHaveLength(2);
      expect(forms[0].title).toBe("Form 1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/forms"),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" }
        })
      );
    });
  });

  describe("getForm", () => {
    test("should fetch a specific form", async () => {
      mockFetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: "test-form",
          title: "Test Form",
          questions: []
        })
      }));
      global.fetch = mockFetch;
      
      const form = await api.getForm("test-form");
      
      expect(form.id).toBe("test-form");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/forms/test-form"),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" }
        })
      );
    });
  });

  describe("createForm", () => {
    test("should create a new form", async () => {
      const newForm = {
        title: "New Survey",
        description: "Test description",
        questions: []
      };
      
      const result = await api.createForm(newForm);
      
      expect(result.id).toBe("new-form-id");
      expect(result.title).toBe("New Survey");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/forms"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newForm)
        })
      );
    });
  });

  describe("submitFormResponse", () => {
    test("should submit form responses", async () => {
      const responses = {
        q1: "5",
        q2: "Test answer",
        q3: "yes"
      };
      
      const result = await api.submitFormResponse("form-id", responses);
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/forms/form-id/responses"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses })
        })
      );
    });
  });

  describe("error handling", () => {
    test("should handle API errors gracefully", async () => {
      mockFetch = mock(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      }));
      global.fetch = mockFetch;
      
      try {
        await api.getForm("non-existent");
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toContain("Failed to fetch form");
      }
    });

    test("should handle network errors", async () => {
      mockFetch = mock(() => Promise.reject(new Error("Network error")));
      global.fetch = mockFetch;
      
      try {
        await api.getForms();
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toContain("Network error");
      }
    });
  });
});