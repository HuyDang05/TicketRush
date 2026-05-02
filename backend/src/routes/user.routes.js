const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const {
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.patch('/me/password', authenticate, changePassword);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;