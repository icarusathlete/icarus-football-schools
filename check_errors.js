const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text(), msg.location());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message, error.stack);
  });

  try {
    await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });
    console.log("Navigated to page");
    // Click on "Player Reports" tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, a, div, span'));
      const reportsTab = tabs.find(t => t.textContent.includes('Player Reports') || t.textContent.includes('EVALUATIONS'));
      if (reportsTab) {
         console.log('Found tab, clicking');
         reportsTab.click();
      } else {
         console.log('Tab not found');
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if the component rendered anything
    const html = await page.evaluate(() => document.body.innerHTML);
    if (html.includes("PLAYER EVALUATIONS")) {
       console.log("EvaluationManager seems to have rendered successfully.");
    } else if (html.includes("Error")) {
       console.log("Found an error boundary or 'Error' text on the page.");
    } else {
       console.log("Could not find 'PLAYER EVALUATIONS' on the page.");
    }
  } catch (e) {
    console.log('SCRIPT ERROR:', e);
  }
  
  await browser.close();
})();
