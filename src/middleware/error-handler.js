import { logger, toErrorMeta, toRequestMeta } from '../lib/logger.js';

export function notFoundApiHandler(req, res) {
  logger.warn('route.not_found', {
    ...toRequestMeta(req),
    statusCode: 404,
  });
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  logger.error('request.unhandled_error', {
    ...toRequestMeta(req),
    statusCode: err?.status || 500,
    error: toErrorMeta(err),
  });
  res.status(err?.status || 500).json({ error: err?.status && err.status < 500 ? err.message : 'Something went wrong' });
}
