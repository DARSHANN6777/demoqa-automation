DemoQA Book Store Automation
A comprehensive end-to-end test automation suite for the DemoQA Book Store Application using Playwright with TypeScript.

Overview
This project automates the complete user journey on the DemoQA Book Store Application:

User login and authentication
Navigation to Book Store section
Book search functionality
Data extraction and file output
User logout
Test Scenarios
Complete Book Store Test Flow
Navigate to DemoQA website
Access Book Store Application
Login with valid credentials
Search for specific book
Extract book details (Title, Author, Publisher)
Save results to file
Logout successfully
Search Without Login
Tests book search functionality without authentication
Validates search results and data extraction
Prerequisites
Node.js: Version 16 or higher
npm: Version 8 or higher
Git: For version control
Installation
Clone the repository
bash
   git clone https://github.com/your-username/demoqa-automation.git
   cd demoqa-automation
Install dependencies
bash
   npm install
Install Playwright browsers
bash
   npx playwright install
Project Structure
demoqa-automation/
├── tests/
│   └── bookstore.spec.ts          # Main test file
├── test-results/
│   ├── screenshots/               # Failure screenshots
│   └── book_details.txt          # Extracted book data
├── package.json
├── playwright.config.ts           # Playwright configuration
└── README.md
Configuration
The project uses the following default configuration:

Browser: Chromium (headed mode)
Viewport: 1280x720
Timeout: 30 seconds
Screenshots: On failure only
Video recording: On failure only
Test Credentials
Update the credentials in bookstore.spec.ts:

typescript
const username = 'your-username';
const password = 'your-password';
Running Tests
Run All Tests
bash
npx playwright test
Run Specific Test
bash
npx playwright test --grep "Complete Book Store Test Flow"
Run in Headed Mode (Visual)
bash
npx playwright test --headed
Run with Debug Mode
bash
npx playwright test --debug
Generate Test Report
bash
npx playwright show-report
Test Results
Console Output
Step-by-step execution logs
Success/failure indicators
Extracted book information display
File Outputs
book_details.txt: Contains extracted book information
Screenshots: Captured on test failures
Videos: Recorded for failed test runs
HTML Report: Detailed test execution report
Sample Output
✓ Navigated to https://demoqa.com/
✓ Navigated to Book Store Application
✓ Logged in with username: Darshan
✓ Login validation successful
✓ Navigated to Book Store page
✓ Searched for: Learning JavaScript Design Patterns
✓ Search result validated - book found
  Title: Learning JavaScript Design Patterns
  Author: Addy Osmani
  Publisher: O'Reilly Media
✓ Book details written to file
✓ Successfully logged out
Key Features
Robust Error Handling
Timeout management for slow-loading elements
Fallback navigation strategies
Screenshot capture on failures
Flexible Element Selection
Multiple selector strategies
Dynamic wait conditions
Cross-browser compatibility
Data Management
Structured data extraction
File system integration
Timestamp tracking
Troubleshooting
Common Issues
Navigation Timeout
DemoQA has slow-loading ads
Solution: Uses domcontentloaded instead of load event
Element Not Found
Dynamic content loading
Solution: Implemented multiple selector fallbacks
Login Validation Failure
Case sensitivity issues
Solution: Uses flexible text matching
Debug Commands
bash
# Run with verbose logging
DEBUG=pw:api npx playwright test

# Run single test with trace
npx playwright test --trace on --grep "Complete Book Store Test Flow"

# Open trace viewer
npx playwright show-trace trace.zip
CI/CD Integration
GitHub Actions Example
yaml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright
      run: npx playwright install --with-deps
    - name: Run tests
      run: npx playwright test
Best Practices Implemented
Test Design
Page Object Model architecture
Separation of concerns
Reusable methods and components
Error Management
Try-catch blocks for critical operations
Meaningful error messages
Graceful failure handling
Maintenance
Configurable timeouts
Environment-specific settings
Comprehensive logging
Technologies Used
Playwright: E2E testing framework
TypeScript: Type-safe JavaScript
Node.js: Runtime environment
File System (fs): Data persistence
Performance Considerations
Optimized wait strategies
Minimal timeout values
Efficient element selection
Resource cleanup
Security Notes
Credentials should be stored in environment variables
Test data should not contain sensitive information
Screenshots may contain user data
Contributing
Fork the repository
Create a feature branch
Make your changes
Add/update tests as needed
Submit a pull request
License
This project is for educational and assessment purposes.

Contact
For questions or issues, please create a GitHub issue or contact [your-email@example.com]

Note: This automation suite is designed for the DemoQA testing website. Ensure you have valid test credentials before running the tests.

