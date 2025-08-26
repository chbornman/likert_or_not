# Comprehensive Testing Plan for Likert or Not MVP

## Overview
This document outlines a comprehensive testing strategy for the Likert or Not web application, utilizing Bun's built-in testing suite for the frontend and Rust's testing framework for the backend.

## Testing Architecture

### Frontend Testing (Bun Test)
- **Unit Tests**: Individual component and utility function testing
- **Integration Tests**: API service layer and component interaction testing
- **E2E Tests**: Critical user journey testing using Playwright with Bun

### Backend Testing (Rust/Cargo)
- **Unit Tests**: Individual handler and model testing
- **Integration Tests**: Database operations and API endpoint testing
- **Performance Tests**: Load testing for concurrent form submissions

## Implementation Plan

### Phase 1: Testing Infrastructure Setup

#### 1.1 Frontend Test Configuration
```typescript
// frontend/bunfig.toml
[test]
preload = ["./test/setup.ts"]
coverage = true
coverageReporter = ["text", "lcov"]
```

#### 1.2 Test Directory Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── __tests__/
│   ├── hooks/
│   │   └── __tests__/
│   ├── services/
│   │   └── __tests__/
│   └── lib/
│       └── __tests__/
├── test/
│   ├── setup.ts
│   ├── fixtures/
│   ├── mocks/
│   └── e2e/
```

#### 1.3 Backend Test Structure
```
backend/
├── src/
│   ├── handlers/
│   │   └── tests.rs
│   ├── models/
│   │   └── tests.rs
│   └── db/
│       └── tests.rs
├── tests/
│   ├── integration/
│   └── fixtures/
```

### Phase 2: Unit Testing Implementation

#### 2.1 React Component Tests
**Priority Components:**
- FormPage (complex state management)
- LikertScale (core functionality)
- FormEditor (admin functionality)
- Question components (all types)

**Test Coverage Goals:**
- Component rendering
- User interactions
- State management
- Props validation
- Error handling

#### 2.2 Utility Function Tests
- Form validation logic
- Date/time formatting
- Data transformation utilities
- Custom hooks

#### 2.3 Backend Unit Tests
- Request handlers
- Data models
- Error handling
- Email service
- Database queries

### Phase 3: Integration Testing

#### 3.1 Frontend Integration Tests
- API service layer testing with mocked backend
- Component integration (form submission flow)
- State management integration
- Router integration

#### 3.2 Backend Integration Tests
- Database operations with test database
- API endpoint testing
- Authentication flow
- Email sending (with mock SMTP)

### Phase 4: End-to-End Testing

#### 4.1 Critical User Flows
1. **Form Creation Flow**
   - Admin login
   - Create new form
   - Add various question types
   - Configure settings
   - Publish form

2. **Form Submission Flow**
   - Access form via link
   - Complete all question types
   - Submit form
   - View success page

3. **Results Viewing Flow**
   - Admin login
   - View form list
   - Access results
   - Export data

#### 4.2 E2E Test Tools
- Playwright with Bun runner
- Test database with seed data
- Docker compose test environment

### Phase 5: Test Data & Fixtures

#### 5.1 Frontend Fixtures
```typescript
// test/fixtures/forms.ts
export const mockForm = {
  id: 'test-form-1',
  title: 'Test Survey',
  questions: [
    { type: 'likert', text: 'How satisfied are you?', required: true },
    { type: 'text', text: 'Additional comments', required: false }
  ]
};
```

#### 5.2 Backend Fixtures
```rust
// tests/fixtures/mod.rs
pub fn create_test_form() -> Form {
    Form {
        id: "test-form-1".to_string(),
        title: "Test Survey".to_string(),
        // ...
    }
}
```

### Phase 6: Continuous Integration

#### 6.1 GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun test:e2e
  
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: cargo test
      - run: cargo clippy
```

## Test Implementation Examples

### Example 1: Component Unit Test
```typescript
// frontend/src/components/__tests__/LikertScale.test.tsx
import { expect, test, describe } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import LikertScale from "../LikertScale";

describe("LikertScale", () => {
  test("renders all scale options", () => {
    const { getByText } = render(
      <LikertScale 
        question={{ text: "Test question", required: true }}
        value=""
        onChange={() => {}}
      />
    );
    
    expect(getByText("Strongly Disagree")).toBeDefined();
    expect(getByText("Strongly Agree")).toBeDefined();
  });

  test("calls onChange when option selected", () => {
    let value = "";
    const { getByLabelText } = render(
      <LikertScale 
        question={{ text: "Test question", required: true }}
        value={value}
        onChange={(v) => { value = v; }}
      />
    );
    
    fireEvent.click(getByLabelText("Agree"));
    expect(value).toBe("4");
  });
});
```

### Example 2: API Service Integration Test
```typescript
// frontend/src/services/__tests__/api.test.ts
import { expect, test, describe, mock } from "bun:test";
import { api } from "../api";

describe("API Service", () => {
  test("submitForm sends correct data", async () => {
    const mockFetch = mock(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ success: true }) 
      })
    );
    global.fetch = mockFetch;

    const formData = { formId: "test", responses: {} };
    await api.submitForm(formData);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/forms/test/responses"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(formData)
      })
    );
  });
});
```

### Example 3: Backend Handler Test
```rust
// backend/src/handlers/tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_form() {
        let app = create_test_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/forms")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"title": "Test Form"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
    }
}
```

### Example 4: E2E Test
```typescript
// frontend/test/e2e/form-submission.test.ts
import { expect, test } from "bun:test";
import { chromium } from "playwright";

test("complete form submission flow", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto("http://localhost:5173/form/test-form");
  
  // Answer Likert question
  await page.click('label:has-text("Agree")');
  
  // Answer text question
  await page.fill('textarea', 'Test response');
  
  // Submit form
  await page.click('button:has-text("Submit")');
  
  // Verify success
  await expect(page.locator('h1')).toContainText('Thank you');
  
  await browser.close();
});
```

## Testing Best Practices

### 1. Test Naming Convention
- Use descriptive test names that explain what is being tested
- Format: `test("should [expected behavior] when [condition]")`

### 2. Test Organization
- Group related tests using `describe` blocks
- Keep tests focused on single functionality
- Use setup and teardown hooks appropriately

### 3. Mocking Strategy
- Mock external dependencies (API calls, database)
- Use realistic test data
- Avoid over-mocking

### 4. Coverage Goals
- Aim for 80% code coverage minimum
- 100% coverage for critical business logic
- Focus on behavior coverage over line coverage

### 5. Performance Testing
- Test form submission with 100+ concurrent users
- Monitor response times under load
- Test database query performance

## Test Commands

### Frontend
```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test src/components/__tests__/LikertScale.test.tsx

# Run E2E tests
bun test:e2e

# Watch mode
bun test --watch
```

### Backend
```bash
# Run all tests
cargo test

# Run specific test
cargo test test_create_form

# Run with output
cargo test -- --nocapture

# Run integration tests only
cargo test --test integration
```

## Monitoring & Reporting

### 1. Coverage Reports
- Generate HTML coverage reports
- Track coverage trends over time
- Set minimum coverage thresholds

### 2. Test Performance
- Monitor test execution time
- Identify slow tests
- Optimize test suite performance

### 3. Failure Analysis
- Implement test failure notifications
- Track flaky tests
- Maintain test reliability metrics

## Timeline

### Week 1-2: Infrastructure & Setup
- Configure test environments
- Set up test databases
- Create initial fixtures

### Week 3-4: Unit Tests
- Component unit tests
- Utility function tests
- Backend unit tests

### Week 5-6: Integration Tests
- API integration tests
- Database integration tests
- Component integration tests

### Week 7: E2E Tests
- Critical flow tests
- Cross-browser testing
- Performance testing

### Week 8: CI/CD & Documentation
- GitHub Actions setup
- Documentation completion
- Team training

## Success Metrics

1. **Coverage**: Achieve 80% overall test coverage
2. **Reliability**: Less than 1% flaky test rate
3. **Performance**: Full test suite runs in under 5 minutes
4. **Automation**: 100% of tests run in CI/CD pipeline
5. **Documentation**: All test patterns documented with examples

## Maintenance Plan

### Regular Tasks
- Weekly: Review and fix flaky tests
- Bi-weekly: Update test fixtures
- Monthly: Coverage analysis and gap identification
- Quarterly: Test suite performance optimization

### Test Review Process
1. All new features require corresponding tests
2. Test PR reviews focus on coverage and quality
3. Breaking tests block deployment
4. Regular test refactoring sessions

## Conclusion

This comprehensive testing plan provides a structured approach to ensuring the quality and reliability of the Likert or Not application. By following this plan, we can achieve high confidence in our codebase and maintain a robust, maintainable application.