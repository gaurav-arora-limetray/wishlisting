const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Serve static files from 'public' directory
app.use(express.static('public'));
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: "Server is working!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});