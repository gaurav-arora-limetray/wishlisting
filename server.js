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

        // Step 2: Fetch the wishlist page to get initial token
        const bandcampUrl = 'https://bandcamp.com/' + fanId;
        console.log('3. Fetching from:', bandcampUrl);
        
        const pageResponse = await fetch(bandcampUrl);
        const html = await pageResponse.text();
        console.log('4. Got HTML length:', html.length);
        
        // Find the total count
        const countMatch = html.match(/view all (\d+) items/);
        const totalCount = countMatch ? parseInt(countMatch[1]) : 20;
        console.log('5. Total count:', totalCount);

        // Find the first token
        const tokenMatch = html.match(/data-token="([^"]+)"/);
        if (!tokenMatch) {
            throw new Error('Could not find wishlist token');
        }
        const firstToken = tokenMatch[1];
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

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