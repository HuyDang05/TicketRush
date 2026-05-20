const express = require('express');

const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { forgotPassword, resetPassword } = require('../controllers/password.controller');
const { googleCallback, googleRedirect } = require('../controllers/google.controller');
const { facebookRedirect, facebookCallback } = require('../controllers/facebook.controller');
const validate = require('../middlewares/validate.middleware');
const {
  forgotPasswordBody,
  loginBody,
  registerBody,
  resetPasswordBody,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validate({ body: registerBody }), register);
router.post('/login', validate({ body: loginBody }), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', validate({ body: forgotPasswordBody }), forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordBody }), resetPassword);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

// Facebook OAuth
router.get('/facebook', facebookRedirect);
router.get('/facebook/callback', facebookCallback);

module.exports = router;
