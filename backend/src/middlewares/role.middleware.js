// Purpose: Middleware Express dung chung cho xac thuc, phan quyen hoac validate request.
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp' });
    }

    return next();
  };
};

const requireAdmin = requireRole(['ADMIN']);

module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
