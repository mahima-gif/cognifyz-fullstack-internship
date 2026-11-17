/**
 * NoSQL Injection Protection Middleware
 * Recursively scans req.body, req.query, and req.params to sanitize data
 * by removing any object keys that begin with '$' (MongoDB query operators like $gt, $where)
 * or contain '.' (which can access nested documents or trigger prototype pollution).
 */

const sanitizeObject = (target) => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  for (const key of Object.keys(target)) {
    // If key starts with '$' or contains '.', strip it out
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      sanitizeObject(target[key]);
    }
  }

  return target;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = sanitizeInput;
