const bookingService = require('../services/booking.service');

async function lockSeatHandler(req, res) {
  const { seatId, socketId, queueToken, queueSessionId } = req.body;
  const userId = req.user.id;

  if (!seatId) {
    return res.status(400).json({ message: 'seatId is required' });
  }

  try {
    const result = await bookingService.lockSeat(userId, seatId, socketId, queueToken, queueSessionId);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getMyTicketsHandler(req, res) {
  try {
    const userId = req.user.id;
    const tickets = await bookingService.getMyTickets(userId);

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

async function releaseSeatHandler(req, res) {
  const { bookingId } = req.params;
  const userId = req.user.id;

  try {
    const result = await bookingService.releaseSeatUser(userId, bookingId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getMyPendingLocksHandler(req, res) {
  try {
    const userId = req.user.id;
    const { eventId } = req.query; // optional

    const locks = await bookingService.getMyPendingLocks(userId, eventId);

    return res.status(200).json({
      success: true,
      data: locks,
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
  releaseSeatHandler,
  getMyPendingLocksHandler,
};
