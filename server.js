const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.static('public'));
app.use(express.json());

app.post('/api/fetch-wishlist', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('1. Received URL:', url);
        
        // Step 1: Get the fan ID from URL
        const fanId = url.split('/').pop();
        console.log('2. Extracted fanId:', fanId);

        // Step 2: Fetch the wishlist page
        const bandcampUrl = 'https://bandcamp.com/' + fanId;
        console.log('3. Fetching from:', bandcampUrl);

        const pageResponse = await fetch(bandcampUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        const html = await pageResponse.text();
        console.log('4. Got HTML length:', html.length);
        
        // Find total count
        const countMatch = html.match(/view all (\d+) items/);
        const totalCount = countMatch ? parseInt(countMatch[1]) : 20;
        console.log('5. Total count:', totalCount);

        // Look for data-blob in the pagedata div
        const dataMatch = html.match(/id="pagedata"\s+data-blob="([^"]*)"/);
        if (!dataMatch) {
            throw new Error('Could not find page data');
        }

        // Parse the data-blob content
        const jsonStr = decodeURIComponent(dataMatch[1].replace(/&quot;/g, '"'));
        const pageData = JSON.parse(jsonStr);

        // Get the first token from the wishlist_data
        let firstToken = '';
        if (pageData && pageData.wishlist_data && pageData.wishlist_data.last_token) {
            firstToken = pageData.wishlist_data.last_token;
        } else {
            throw new Error('Could not find wishlist token');
        }
        console.log('6. First token:', firstToken);

        // Step 3: Fetch the complete wishlist
        const apiPayload = {
            fan_id: fanId,
            older_than_token: firstToken,
            count: totalCount
        };
        console.log('7. Making API request with:', apiPayload);

        const wishlistResponse = await fetch('https://bandcamp.com/api/fancollection/1/wishlist_items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://bandcamp.com',
                'Referer': `https://bandcamp.com/${fanId}`
            },
            body: JSON.stringify(apiPayload)
        });

        if (!wishlistResponse.ok) {
            console.log('API Response status:', wishlistResponse.status);
            const text = await wishlistResponse.text();
            console.log('API Response text:', text);
            throw new Error('Failed to fetch wishlist data');
        }

        const wishlistData = await wishlistResponse.json();
        console.log('8. Got API response:', wishlistData);
        
        res.json(wishlistData);

    } catch (error) {
        console.error('ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});