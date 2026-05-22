const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/jwt.util');

const authenticate = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authorizationHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = payload?.id ?? payload?.userId ?? payload?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = authenticate;
