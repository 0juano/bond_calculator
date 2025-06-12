const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  // Go to the bond calculator page
  await page.goto('http://localhost:3000/calculator/bond_1749486682344_9sgdd0cou');
  
  // Wait for the page to load
  await page.waitForSelector('.font-mono', { timeout: 10000 });
  
  // Get the current values
  const values = await page.evaluate(() => {
    const priceInput = document.querySelector('#price');
    const yieldSpan = document.querySelector('#yield');
    const spreadDiv = document.querySelector('.bg-gray-800.border.border-gray-600.rounded-md.font-mono.text-white');
    
    return {
      price: priceInput?.value,
      yield: yieldSpan?.value,
      spread: spreadDiv?.textContent
    };
  });
  
  console.log('Current values:', values);
  
  // Check console for predefined cash flows
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clear the price field first
  await page.click('#price', {clickCount: 3}); // Triple click to select all
  await page.keyboard.press('Backspace');
  
  // Change the price to 72.25
  await page.type('#price', '72.25', {delay: 100});
  await page.keyboard.press('Enter');
  
  // Wait for recalculation
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get new values
  const newValues = await page.evaluate(() => {
    const priceInput = document.querySelector('#price');
    const yieldInput = document.querySelector('#yield');
    const spreadDiv = document.querySelector('.bg-gray-800.border.border-gray-600.rounded-md.font-mono.text-white');
    
    return {
      price: priceInput?.value,
      yield: yieldInput?.value,
      spread: spreadDiv?.textContent
    };
  });
  
  console.log('New values after setting price to 72.25:', newValues);
  
  // Keep browser open for inspection
  // await browser.close();
})();