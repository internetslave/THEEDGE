import { isPlainObject } from '../utils/validation.js';

export function requireJsonObject({ maxKeys = 40 } = {}) {
  return (req, res, next) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type application/json required' });
    }

    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    if (Object.keys(req.body).length > maxKeys) {
      return res.status(400).json({ error: 'Too many fields in request body' });
    }

    next();
  };
}
