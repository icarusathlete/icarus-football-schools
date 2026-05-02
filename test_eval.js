const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting puppeteer script...');
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Capture console errors and logs
    page.on('console', async msg => {
        const args = await Promise.all(msg.args().map(a => a.jsonValue().catch(() => a.toString())));
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`, args.length ? args : '');
    });

    page.on('pageerror', error => {
        console.log(`[PAGE ERROR]: ${error.message}`);
    });

    page.on('requestfailed', request => {
        // console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
        console.log('Navigating to http://localhost:3016');
        await page.goto('http://localhost:3016', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('Looking for Player Reports navigation item...');
        // Find and click the Player Reports link (or icon)
        const playerReportsClicked = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('button, a, div'));
            const reportLink = links.find(el => el.textContent && el.textContent.includes('PLAYER REPORTS'));
            if (reportLink) {
                reportLink.click();
                return true;
            }
            return false;
        });

        if (playerReportsClicked) {
            console.log('Clicked Player Reports. Waiting for navigation/render...');
            await new Promise(r => setTimeout(r, 2000)); // Wait for potential errors or rendering
            
            // Check if any player cards are visible
            const hasPlayers = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('h3'));
                return elements.some(el => el.textContent && el.textContent.length > 0);
            });
            console.log(`Player cards visible: ${hasPlayers}`);
            
            // Try to click a player if available
            await page.evaluate(() => {
                const glassCards = Array.from(document.querySelectorAll('.glass-card'));
                // Find one that looks like a player card (has a trash icon or eye icon or similar, or just click the first one that isn't empty)
                const playerCard = glassCards.find(card => card.querySelector('h3'));
                if (playerCard) {
                    console.log('Found player card, clicking...');
                    playerCard.click();
                }
            });
            
            await new Promise(r => setTimeout(r, 2000)); // Wait after clicking player
            
        } else {
            console.log('Could not find Player Reports button. Trying to see what is on screen.');
            const content = await page.content();
            console.log('HTML content length:', content.length);
            console.log('Body content start:', content.substring(0, 500));
        }

    } catch (e) {
        console.error('Script failed:', e);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
})();
