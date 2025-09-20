import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface BookDetails {
  title: string;
  author: string;
  publisher: string;
}

class DemoQABookStoreTest {
  constructor(private page: Page) {}

  async navigateToDemoQA() {
    await this.page.goto('https://demoqa.com/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    // Wait for the main content to be visible
    await this.page.waitForSelector('h5:has-text("Book Store Application")', {
      timeout: 8000
    });
    
    console.log('Navigated to https://demoqa.com/');
  }

  async navigateToBookStoreApplication() {
    // Click on Book Store Application card from the main page
    await this.page.click('text=Book Store Application');
    await this.page.waitForURL('**/books');
    console.log('Navigated to Book Store Application');
  }

  async loginUser(username: string, password: string) {
    // Click on Login from sidebar
    await this.page.click('text=Login');
    await this.page.waitForURL('**/login');
    
    // Enter username
    await this.page.fill('#userName', username);
    
    // Enter password
    await this.page.fill('#password', password);
    
    // Click Login button
    await this.page.click('#login');
    
    // Wait for successful login (redirect to profile page)
    await this.page.waitForURL('**/profile');
    console.log(`✓ Logged in with username: ${username}`);
  }

  async validateLoginSuccess(expectedUsername: string) {
    // Wait for the profile page to load completely
    await this.page.waitForTimeout(2000);
    
    // Look for the username display - DemoQA displays usernames in lowercase
    const usernameDisplay = this.page.locator(`text=${expectedUsername.toLowerCase()}`).first();
    await expect(usernameDisplay).toBeVisible({ timeout: 5000 });
    
    // Validate logout button is present
    const logoutButton = this.page.locator('text=Log out');
    await expect(logoutButton).toBeVisible();
    
    console.log('Login validation successful - username and logout button verified');
  }

  async clickBookStoreButton() {
    // Navigate directly to Book Store page if not already there
    const currentUrl = this.page.url();
    
    if (currentUrl.includes('/books')) {
      console.log('Already on Book Store page');
      return;
    }
    
    // Try clicking "Go To Book Store" button first (from profile page)
    const goToBookStoreBtn = this.page.locator('text=Go To Book Store');
    if (await goToBookStoreBtn.isVisible()) {
      await goToBookStoreBtn.click();
      await this.page.waitForURL('**/books', { timeout: 8000 });
    } else {
      // If not found, click on Book Store from sidebar
      await this.page.click('text=Book Store');
      await this.page.waitForURL('**/books', { timeout: 8000 });
    }
    
    // Wait for the books page to load by checking for search box
    await this.page.waitForSelector('input[placeholder*="search"], #searchBox', { timeout: 10000 });
    
    console.log('Navigated to Book Store page');
  }

  async searchBook(bookTitle: string) {
    // Wait for search box to be available and find it
    const searchBox = this.page.locator('input[placeholder*="search"], #searchBox, input[type="text"]').first();
    await searchBox.waitFor({ timeout: 5000 });
    
    // Clear any existing text and enter search term
    await searchBox.fill('');
    await searchBox.fill(bookTitle);
    
    // Wait for search results to load
    await this.page.waitForTimeout(3000);
    console.log(`Searched for: ${bookTitle}`);
  }

  async validateSearchResult(expectedBookTitle: string): Promise<BookDetails> {
    // Wait for search results table to load
    await this.page.waitForSelector('.rt-tbody .rt-tr-group, table tbody tr', { timeout: 8000 });
    
    // Get the first row of results
    const firstRow = this.page.locator('.rt-tbody .rt-tr-group').first();
    
    // Wait for the row to be visible
    await firstRow.waitFor({ timeout: 5000 });
    
    // Extract book details - adjust selectors based on table structure
    const titleElement = firstRow.locator('.rt-td').nth(1).locator('a');
    const authorElement = firstRow.locator('.rt-td').nth(2);
    const publisherElement = firstRow.locator('.rt-td').nth(3);
    
    // Wait for elements to be visible
    await titleElement.waitFor({ timeout: 5000 });
    await authorElement.waitFor({ timeout: 5000 });
    await publisherElement.waitFor({ timeout: 5000 });
    
    const title = (await titleElement.textContent())?.trim() || '';
    const author = (await authorElement.textContent())?.trim() || '';
    const publisher = (await publisherElement.textContent())?.trim() || '';
    
    // Validate that the search result contains the expected book
    expect(title.toLowerCase()).toContain(expectedBookTitle.toLowerCase());
    
    console.log('Search result validated - book found');
    console.log(`  Title: ${title}`);
    console.log(`  Author: ${author}`);
    console.log(`  Publisher: ${publisher}`);
    
    return { title, author, publisher };
  }

  async writeBookDetailsToFile(bookDetails: BookDetails, filename: string = 'book_details.txt') {
    const content = `Book Details:
Title: ${bookDetails.title}
Author: ${bookDetails.author}
Publisher: ${bookDetails.publisher}
Date: ${new Date().toISOString()}
`;
    
    // Ensure the directory exists
    const filePath = path.join(process.cwd(), 'test-results', filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Book details written to file: ${filePath}`);
  }

  async logout() {
  // Check if we're already on profile page
  const currentUrl = this.page.url();
  if (!currentUrl.includes('/profile')) {
    // Navigate to profile page first
    await this.page.click('text=Profile');
    await this.page.waitForURL('**/profile', { timeout: 5000 });
  }
  
  // Click logout button using text-based selector to avoid ID conflicts
  await this.page.getByRole('button', { name: 'Log out' }).click();
  
  // Wait for redirect to login page
  await this.page.waitForURL('**/login', { timeout: 50000 });
  console.log('Successfully logged out');
 }
}

// Test execution
test.describe('DemoQA Book Store Application', () => {
  test('Complete Book Store Test Flow', async ({ page }) => {
    const bookStoreTest = new DemoQABookStoreTest(page);
    
    // Test credentials
    const username = 'Darshan';
    const password = 'Darshann@6777';
    const searchBookTitle = 'Learning JavaScript Design Patterns';
    
    try {
      // Step 1: Navigate to DemoQA
      await bookStoreTest.navigateToDemoQA();
      
      // Step 2: Navigate to Book Store Application
      await bookStoreTest.navigateToBookStoreApplication();
      
      // Step 3: Login with existing user
      await bookStoreTest.loginUser(username, password);
      
      // Step 4: Validate successful login
      await bookStoreTest.validateLoginSuccess(username);
      
      // Step 5: Click on Book Store button
      await bookStoreTest.clickBookStoreButton();
      
      // Step 6: Search for the specified book
      await bookStoreTest.searchBook(searchBookTitle);
      
      // Step 7: Validate search result and extract book details
      const bookDetails = await bookStoreTest.validateSearchResult(searchBookTitle);
      
      // Step 8: Write book details to file
      await bookStoreTest.writeBookDetailsToFile(bookDetails);
      
      // Step 9: Logout
      await bookStoreTest.logout();
      
      console.log('All test steps completed successfully!');
      
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
  
  // Additional test for just the search functionality
  test('Search Book Without Login', async ({ page }) => {
    const bookStoreTest = new DemoQABookStoreTest(page);
    
    await bookStoreTest.navigateToDemoQA();
    await bookStoreTest.navigateToBookStoreApplication();
    
    // Search without login
    await bookStoreTest.searchBook('Learning JavaScript Design Patterns');
    const bookDetails = await bookStoreTest.validateSearchResult('Learning JavaScript Design Patterns');
    await bookStoreTest.writeBookDetailsToFile(bookDetails, 'search_only_results.txt');
  });
});

// Playwright configuration helpers
export const playwrightConfig = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    headless: false, // Set to true for headless mode
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    },
  ],
};