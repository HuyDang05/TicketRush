const { checkout } = require('../services/checkout.service');

async function checkoutHandler(req, res) {
  const { bookingIds } = req.body;
  const userId = req.user.id;

  if (!bookingIds) {
    return res.status(400).json({ message: 'bookingIds là bắt buộc' });
  }

  try {
    const tickets = await checkout(userId, bookingIds);
    return res.status(200).json({ tickets });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message });
  }
}

module.exports = { checkoutHandler };
