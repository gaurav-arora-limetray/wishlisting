const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.static('public'));
app.use(express.json());



app.post('/api/fetch-wishlist', async (req, res) => {
    try {
        const { url } = req.body;
        
        // Step 1: Get the fan ID from URL
        const fanId = url.split('/').pop();

        // Step 2: Fetch the wishlist page to get initial token
        const pageResponse = await fetch('https://bandcamp.com/' + fanId);

        const html = await pageResponse.text();
        
        // Find the total count from the "view all X items" button
        const countMatch = html.match(/view all (\d+) items/);
        const totalCount = countMatch ? parseInt(countMatch[1]) : 20;

        // Find the first token
        const tokenMatch = html.match(/data-token="([^"]+)"/);
        if (!tokenMatch) {
            throw new Error('Could not find wishlist token');
        }
        const firstToken = tokenMatch[1];

        // Step 3: Fetch the complete wishlist
        const wishlistResponse = await fetch('https://bandcamp.com/api/fancollection/1/wishlist_items', {
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

        const wishlistData = await wishlistResponse.json();
        res.json(wishlistData);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});