import { mockForm, mockFormList, mockResponses } from "../fixtures/forms";

export const mockHandlers = {
  getForms: () => Promise.resolve(mockFormList),
  
  getForm: (id: string) => {
    const form = mockFormList.find(f => f.id === id);
    return form ? Promise.resolve(form) : Promise.reject(new Error("Form not found"));
  },
  
  createForm: (data: any) => Promise.resolve({
    ...mockForm,
    id: `form-${Date.now()}`,
    title: data.title,
    description: data.description,
    questions: data.questions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  updateForm: (id: string, data: any) => Promise.resolve({
    ...data,
    id,
    updated_at: new Date().toISOString()
  }),
  
  deleteForm: (id: string) => Promise.resolve({ success: true }),
  
  submitFormResponse: (formId: string, responses: any) => Promise.resolve({
    success: true,
    response_id: `response-${Date.now()}`
  }),
  
  getFormResponses: (formId: string) => Promise.resolve(mockResponses),
  
  exportFormResponses: (formId: string, format: string) => {
    const blob = new Blob(["mock export data"], { type: "application/octet-stream" });
    return Promise.resolve(blob);
  },
  
  adminLogin: (password: string) => {
    if (password === "test-password") {
      return Promise.resolve({ token: "mock-jwt-token" });
    }
    return Promise.reject(new Error("Invalid password"));
  },
  
  validateToken: (token: string) => {
    return token === "mock-jwt-token" 
      ? Promise.resolve({ valid: true })
      : Promise.reject(new Error("Invalid token"));
  }
};

export const setupMockAPI = () => {
  const originalFetch = global.fetch;
  
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.includes('/api/forms') && options?.method === 'GET') {
      if (urlString.match(/\/api\/forms\/[^\/]+$/)) {
        const id = urlString.split('/').pop();
        const form = await mockHandlers.getForm(id!);
        return new Response(JSON.stringify(form), { status: 200 });
      }
      const forms = await mockHandlers.getForms();
      return new Response(JSON.stringify(forms), { status: 200 });
    }
    
    if (urlString.includes('/api/forms') && options?.method === 'POST') {
      const data = JSON.parse(options.body as string);
      const form = await mockHandlers.createForm(data);
      return new Response(JSON.stringify(form), { status: 201 });
    }
    
    if (urlString.includes('/responses') && options?.method === 'POST') {
      const data = JSON.parse(options.body as string);
      const response = await mockHandlers.submitFormResponse('', data.responses);
      return new Response(JSON.stringify(response), { status: 200 });
    }
    
    if (urlString.includes('/responses') && options?.method === 'GET') {
      const responses = await mockHandlers.getFormResponses('');
      return new Response(JSON.stringify(responses), { status: 200 });
    }
    
    if (urlString.includes('/admin/login')) {
      const data = JSON.parse(options?.body as string);
      try {
        const result = await mockHandlers.adminLogin(data.password);
        return new Response(JSON.stringify(result), { status: 200 });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });
      }
    }
    
    return originalFetch(url, options);
  };
  
  return () => {
    global.fetch = originalFetch;
  };
};