import puppeteer from 'puppeteer';

async function checkBondCalculatorFormatting() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the bond calculator
    await page.goto('http://localhost:3000/calculator/bond_1749486682344_9sgdd0cou', { waitUntil: 'networkidle0' });
    
    // Take a screenshot to see what loaded
    await page.screenshot({ path: 'page-load-check.png', fullPage: true });
    console.log('Page loaded, screenshot saved as page-load-check.png');
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find any element that indicates the page loaded
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    
    // Look for the Key Metrics section more broadly
    const hasMetrics = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        if (el.textContent && el.textContent.includes('Key Metrics')) {
          return true;
        }
      }
      return false;
    });
    
    console.log('Has Key Metrics section:', hasMetrics);
    
    // Enter a price to trigger calculations
    const priceInput = await page.$('input[placeholder="Enter price"]');
    if (priceInput) {
      await priceInput.click({ clickCount: 3 }); // Select all
      await priceInput.type('72.25');
      
      // Wait for calculations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Take a screenshot of the Key Metrics panel
    const keyMetricsPanel = await page.$('.key-metrics-panel');
    if (keyMetricsPanel) {
      await keyMetricsPanel.screenshot({ path: 'key-metrics-formatting.png' });
      console.log('Screenshot saved as key-metrics-formatting.png');
    }
    
    // Extract and log the metrics values
    const metrics = await page.evaluate(() => {
      const metricsData = {};
      const metricRows = document.querySelectorAll('.key-metrics-panel .metric-row');
      
      metricRows.forEach(row => {
        const label = row.querySelector('.metric-label')?.textContent?.trim();
        const value = row.querySelector('.metric-value')?.textContent?.trim();
        if (label && value) {
          metricsData[label] = value;
        }
      });
      
      return metricsData;
    });
    
    console.log('\nKey Metrics Values:');
    console.log('==================');
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    // Check formatting rules
    console.log('\nFormatting Analysis:');
    console.log('===================');
    
    // Check percentages (should have 2 decimal places)
    const percentageFields = ['Yield to Maturity', 'Current Yield', 'Yield to Worst', 'Coupon Rate'];
    percentageFields.forEach(field => {
      if (metrics[field]) {
        const match = metrics[field].match(/(\d+\.\d+)%/);
        if (match) {
          const decimals = match[1].split('.')[1]?.length || 0;
          console.log(`${field}: ${metrics[field]} - ${decimals === 2 ? '✓ Correct' : '✗ Should have 2 decimals'}`);
        }
      }
    });
    
    // Check numeric values with thousands separators
    const numericFields = ['Modified Duration', 'Macaulay Duration', 'DV01', 'Convexity', 'Spread to Treasury'];
    numericFields.forEach(field => {
      if (metrics[field]) {
        const hasThousandsSeparator = metrics[field].includes(',');
        const match = metrics[field].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        if (match) {
          const parts = match[1].split('.');
          const decimals = parts[1]?.length || 0;
          const needsSeparator = parseInt(parts[0].replace(/,/g, '')) >= 1000;
          
          console.log(`${field}: ${metrics[field]} - Decimals: ${decimals === 2 ? '✓' : '✗'}, Separator: ${!needsSeparator || hasThousandsSeparator ? '✓' : '✗'}`);
        }
      }
    });
    
    // Check days to next coupon (should be whole number)
    if (metrics['Days to Next Coupon']) {
      const hasDecimals = metrics['Days to Next Coupon'].includes('.');
      console.log(`Days to Next Coupon: ${metrics['Days to Next Coupon']} - ${!hasDecimals ? '✓ Correct (whole number)' : '✗ Should be whole number'}`);
    }
    
    // Wait a bit before closing
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkBondCalculatorFormatting();