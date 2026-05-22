const { ZodError } = require('zod');

const formatPath = (path) => path.join('.') || 'root';

const formatZodErrors = (error) =>
  error.issues.map((issue) => ({
    field: formatPath(issue.path),
    message: issue.message,
  }));

const validate = (schemas = {}) => (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params || {});
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query || {});
    }

    if (schemas.body) {
      req.body = schemas.body.parse(req.body || {});
    }

    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: formatZodErrors(error),
      });
    }

    return next(error);
  }
};

module.exports = validate;
