const puppeteer = require('puppeteer');

async function testPuppeteer() {
  try {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      headless: "new"
    });
    
    console.log('Browser launched successfully');
    const page = await browser.newPage();
    console.log('New page created');
    
    await page.goto('https://example.com');
    console.log('Navigation successful');
    
    await browser.close();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPuppeteer();