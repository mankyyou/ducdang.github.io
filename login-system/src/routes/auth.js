const express = require('express');
const router = express.Router();

// Hardcoded user credentials
const hardcodedUser = {
    id: 'user123',
    password: 'password123'
};

// Login route
router.post('/login', (req, res) => {
    const { id, password } = req.body;

    if (id === hardcodedUser.id && password === hardcodedUser.password) {
        return res.status(200).json({ message: 'Login successful' });
    } else {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
});

module.exports = router;