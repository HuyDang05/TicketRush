// Purpose: Controller nhan request HTTP, goi service/Prisma va chuan hoa response cho API.
const {
  getAudienceAnalytics,
} = require('../services/admin-analytics.service');

async function getAudienceAnalyticsHandler(req, res) {
  try {
    const { eventId } = req.query;

    const data = await getAudienceAnalytics(eventId);

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
  getAudienceAnalyticsHandler,
};