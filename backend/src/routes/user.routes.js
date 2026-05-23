// Purpose: Khai bao route Express va gan middleware/controller tuong ung.
const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const {
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require('../controllers/user.controller');
const validate = require('../middlewares/validate.middleware');
const {
  changePasswordBody,
  updateProfileBody,
} = require('../validators/user.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý tài khoản người dùng
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Lấy thông tin tài khoản hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Cập nhật thông tin cá nhân
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/me', authenticate, validate({ body: updateProfileBody }), updateProfile);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Đổi mật khẩu
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 */
router.patch('/me/password', authenticate, validate({ body: changePasswordBody }), changePassword);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Xóa tài khoản hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 */
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
