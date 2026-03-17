import { isServiceError } from './service-error.js';
import { logger, toErrorMeta, toRequestMeta } from '../lib/logger.js';

export function handleControllerError(res, error, fallbackMessage = 'Something went wrong', fallbackStatus = 500) {
  const req = res.req;
  if (isServiceError(error)) {
    if (error.status >= 500) {
      logger.error('request.service_error', {
        ...toRequestMeta(req),
        statusCode: error.status,
        errorType: error.errorType || null,
        error: {
          name: error.name || 'ServiceError',
          message: error.message,
        },
      });
    }
    const body = { error: error.message };
    if (typeof error.success === 'boolean') body.success = error.success;
    if (error.errorType) body.errorType = error.errorType;
    return res.status(error.status).json(body);
  }

  logger.error('request.controller_error', {
    ...toRequestMeta(req),
    statusCode: fallbackStatus,
    error: toErrorMeta(error),
  });
  return res.status(fallbackStatus).json({ error: fallbackMessage });
}
