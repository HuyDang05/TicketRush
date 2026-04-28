const express = require('express');

const authenticate = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/profile', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
