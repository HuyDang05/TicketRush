const { lockSeat } = require('../services/booking.service');

async function lockSeatHandler(req, res) {
  const { seatId } = req.body;
  const userId = req.user.id;

  if (!seatId) {
    return res.status(400).json({ message: 'seatId là bắt buộc' });
  }

  try {
    const result = await lockSeat(userId, seatId);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message });
  }
}

module.exports = { lockSeatHandler };
