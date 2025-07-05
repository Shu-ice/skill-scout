const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  
  try {
    // Launch browser
    const browser = await chromium.launch({ 
      headless: true,  // Run in headless mode
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ] // For WSL compatibility
    });
    
    console.log('Browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    console.log('New page created');
    
    // Navigate to Google
    console.log('Navigating to Google...');
    await page.goto('https://www.google.com');
    console.log('Successfully navigated to Google');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');
    
    // Take a screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'google-screenshot.png', fullPage: true });
    console.log('Screenshot saved as google-screenshot.png');
    
    // Get the page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Keep the browser open for a few seconds so you can see it
    console.log('Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close the browser
    await browser.close();
    console.log('Browser closed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();