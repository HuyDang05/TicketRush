// Purpose: Controller nhan request HTTP, goi service/Prisma va chuan hoa response cho API.
const {
  getAdminDashboard,
} = require('../services/admin-dashboard.service');

async function getAdminDashboardHandler(req, res) {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'eventId is required',
    });
  }

  try {
    const data = await getAdminDashboard(eventId);

    return res.status(200).json({
      success: true,
      data,
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
  getAdminDashboardHandler,
};