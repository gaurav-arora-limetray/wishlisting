const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.static('public'));
app.use(express.json());

app.post('/api/fetch-wishlist', async (req, res) => {
    let browser;
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const fanId = url.split('/').pop();
        if (!fanId) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            headless: "new"
        });
        
        const page = await browser.newPage();
        
        // Set timeout and viewport
        await page.setViewport({ width: 1280, height: 800 });
        page.setDefaultNavigationTimeout(30000);

        // Navigate to the wishlist page
        await page.goto(`https://bandcamp.com/${fanId}/wishlist`, {
            waitUntil: 'networkidle0'
        });

        // Wait for items to load
        await page.waitForSelector('.collection-item-container', { timeout: 10000 })
            .catch(() => {
                throw new Error('No wishlist items found');
            });

        // Extract tokens and count
        const pageData = await page.evaluate(() => {
            const items = document.querySelectorAll('.collection-item-container');
            if (!items.length) return null;

            const tokens = Array.from(items).map(item => {
                const token = item.getAttribute('data-token');
                const timestamp = parseInt(token.split(':')[0]);
                return { token, timestamp };
            });
            
            tokens.sort((a, b) => a.timestamp - b.timestamp);
            
            const showMoreButton = document.querySelector('.show-more');
            let totalCount = items.length;
            
            if (showMoreButton) {
                const match = showMoreButton.textContent.match(/view all (\d+) items/);
                if (match) totalCount = parseInt(match[1]);
            }

            return {
                firstToken: tokens[0]?.token,
                totalCount
            };
        });

        if (!pageData || !pageData.firstToken) {
            throw new Error('Failed to extract wishlist data');
        }

        // Make API request
        const wishlistData = await page.evaluate(async (fanId, firstToken, totalCount) => {
            try {
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
                
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                throw new Error(`API request failed: ${error.message}`);
            }
        }, fanId, pageData.firstToken, pageData.totalCount);

        res.json(wishlistData);

    } catch (error) {
        console.error('ERROR:', error);
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                console.error('Error closing browser:', error);
            }
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});