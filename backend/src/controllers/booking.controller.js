const { lockSeat, getMyTickets } = require('../services/booking.service');

async function lockSeatHandler(req, res) {
  const { seatId } = req.body;
  const userId = req.user.id;

  if (!seatId) {
    return res.status(400).json({ message: 'seatId is required' });
  }

  try {
    const result = await lockSeat(userId, seatId);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getMyTicketsHandler(req, res) {
  try {
    const userId = req.user.id;
    const tickets = await getMyTickets(userId);

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  lockSeatHandler,
  getMyTicketsHandler,
};