import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { chromium, Browser, Page } from "playwright";

describe("Admin Flow E2E", () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || "http://localhost:5173";
  const adminPassword = process.env.ADMIN_PASSWORD || "test-password";

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false"
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test("should login to admin panel", async () => {
    await page.goto(`${baseUrl}/admin`);
    
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button:has-text("Login")');
    
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    
    const dashboardTitle = await page.textContent('h1');
    expect(dashboardTitle).toContain("Admin Dashboard");
  });

  test("should create a new form", async () => {
    await page.goto(`${baseUrl}/admin`);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button:has-text("Login")');
    
    await page.click('button:has-text("Create New Form")');
    
    await page.fill('input[placeholder="Form Title"]', 'Test Survey E2E');
    await page.fill('textarea[placeholder="Description"]', 'This is a test survey created by E2E test');
    
    await page.click('button:has-text("Add Question")');
    await page.selectOption('select', 'likert');
    await page.fill('input[placeholder="Question text"]', 'How satisfied are you?');
    
    await page.click('button:has-text("Add Question")');
    await page.selectOption('select', 'text');
    await page.fill('input[placeholder="Question text"]', 'Please provide feedback');
    
    await page.click('button:has-text("Save Form")');
    
    await page.waitForSelector('text="Form created successfully"');
    
    const successMessage = await page.textContent('.toast-message');
    expect(successMessage).toContain("created successfully");
  }, 30000);

  test("should view form results", async () => {
    await page.goto(`${baseUrl}/admin`);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button:has-text("Login")');
    
    await page.click('text="View Results"');
    
    await page.waitForSelector('h2:has-text("Results")');
    
    const resultsTitle = await page.textContent('h2');
    expect(resultsTitle).toContain("Results");
    
    const exportButton = await page.isVisible('button:has-text("Export")');
    expect(exportButton).toBe(true);
  });

  test("should edit existing form", async () => {
    await page.goto(`${baseUrl}/admin`);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button:has-text("Login")');
    
    await page.click('button:has-text("Edit")');
    
    await page.fill('input[value*="Survey"]', 'Updated Survey Title');
    
    await page.click('button:has-text("Update Form")');
    
    await page.waitForSelector('text="Form updated successfully"');
    
    const successMessage = await page.textContent('.toast-message');
    expect(successMessage).toContain("updated successfully");
  });

  test("should export form results", async () => {
    await page.goto(`${baseUrl}/admin`);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button:has-text("Login")');
    
    await page.click('text="View Results"');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export to Excel")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});