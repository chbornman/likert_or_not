import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { chromium, Browser, Page } from "playwright";

describe("Form Submission E2E", () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || "http://localhost:5173";

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false"
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test("should complete full form submission flow", async () => {
    await page.goto(`${baseUrl}/form/test-form-id`);
    
    await page.waitForSelector('h1');
    const title = await page.textContent('h1');
    expect(title).toContain("Survey");
    
    await page.click('label:has-text("Agree")');
    
    await page.fill('input[type="text"]', 'John Doe');
    
    await page.fill('textarea', 'This is my feedback about the service.');
    
    await page.click('label:has-text("Yes")');
    
    await page.selectOption('select', 'option-2');
    
    await page.click('button:has-text("Submit")');
    
    await page.waitForURL(/\/success/);
    
    const successMessage = await page.textContent('h1');
    expect(successMessage).toContain("Thank you");
  }, 30000);

  test("should validate required fields", async () => {
    await page.goto(`${baseUrl}/form/test-form-id`);
    
    await page.click('button:has-text("Submit")');
    
    const errorMessage = await page.textContent('.text-red-500');
    expect(errorMessage).toContain("required");
  });

  test("should handle form navigation", async () => {
    await page.goto(`${baseUrl}/form/test-form-id`);
    
    await page.click('label:has-text("Neutral")');
    await page.fill('input[type="text"]', 'Test User');
    
    await page.reload();
    
    const nameInput = await page.inputValue('input[type="text"]');
    expect(nameInput).toBe("");
  });

  test("should handle different question types", async () => {
    await page.goto(`${baseUrl}/form/test-form-id`);
    
    const likertExists = await page.isVisible('text="Strongly Agree"');
    expect(likertExists).toBe(true);
    
    const textInputExists = await page.isVisible('input[type="text"]');
    expect(textInputExists).toBe(true);
    
    const textareaExists = await page.isVisible('textarea');
    expect(textareaExists).toBe(true);
    
    const checkboxExists = await page.isVisible('input[type="checkbox"]');
    expect(checkboxExists).toBe(true);
    
    const radioExists = await page.isVisible('input[type="radio"]');
    expect(radioExists).toBe(true);
  });
});