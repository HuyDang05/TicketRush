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

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate({ body: updateProfileBody }), updateProfile);
router.patch('/me/password', authenticate, validate({ body: changePasswordBody }), changePassword);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
