const express = require('express');

const { register, login } = require('../controllers/auth.controller');
const { forgotPassword, resetPassword } = require('../controllers/password.controller');
const { googleCallback, googleRedirect } = require('../controllers/google.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

module.exports = router;
