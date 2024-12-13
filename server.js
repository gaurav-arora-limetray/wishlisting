const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.static('public'));
app.use(express.json());

app.post('/api/fetch-wishlist', async (req, res) => {
    let browser;
    try {
        const { url } = req.body;
        const fanId = url.split('/').pop();
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Navigate to the wishlist page
        await page.goto(`https://bandcamp.com/${fanId}/wishlist`);
        await page.waitForSelector('.collection-item-container');

        // Extract all tokens and total count
        const pageData = await page.evaluate(() => {
            const items = document.querySelectorAll('.collection-item-container');
            const tokens = Array.from(items).map(item => {
                const token = item.getAttribute('data-token');
                const timestamp = parseInt(token.split(':')[0]);
                return { token, timestamp };
            });
            
            // Sort by timestamp ascending
            tokens.sort((a, b) => a.timestamp - b.timestamp);
            
            const countText = document.querySelector('.show-more').textContent;
            const totalCount = parseInt(countText.match(/view all (\d+) items/)[1]);

            return {
                firstToken: tokens[0].token,  // Get earliest token
                totalCount
            };
        });

        // Make API request using earliest token
        const wishlistData = await page.evaluate(async (fanId, firstToken, totalCount) => {
            const response = await fetch('https://bandcamp.com/api/fancollection/1/wishlist_items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fan_id: fanId,
                    older_than_token: firstToken,
                    count: totalCount
                })
            });
            return await response.json();
        }, fanId, pageData.firstToken, pageData.totalCount);

        res.json(wishlistData);

    } catch (error) {
        console.error('ERROR:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});