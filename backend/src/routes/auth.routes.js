// Purpose: Khai bao route Express va gan middleware/controller tuong ung.
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
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Đăng ký, đăng nhập, quên mật khẩu, OAuth
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *     responses:
 *       201:
 *         description: Register successfully
 */
router.post('/register', validate({ body: registerBody }), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successfully
 */
router.post('/login', validate({ body: loginBody }), login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Làm mới access token
 *     responses:
 *       200:
 *         description: New access token
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất
 *     responses:
 *       200:
 *         description: Logout successfully
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Gửi email quên mật khẩu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post('/forgot-password', validate({ body: forgotPasswordBody }), forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Đặt lại mật khẩu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/reset-password', validate({ body: resetPasswordBody }), resetPassword);

// Google OAuth

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Chuyển hướng đăng nhập Google
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get('/google', googleRedirect);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Callback Google OAuth
 *     responses:
 *       200:
 *         description: Google login callback
 */
router.get('/google/callback', googleCallback);

// Facebook OAuth

/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     tags: [Auth]
 *     summary: Chuyển hướng đăng nhập Facebook
 *     responses:
 *       302:
 *         description: Redirect to Facebook
 */
router.get('/facebook', facebookRedirect);

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Callback Facebook OAuth
 *     responses:
 *       200:
 *         description: Facebook login callback
 */
router.get('/facebook/callback', facebookCallback);

module.exports = router;
