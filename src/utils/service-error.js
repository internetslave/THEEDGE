export class ServiceError extends Error {
  constructor(status, message, extras = {}) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    Object.assign(this, extras);
  }
}

export function isServiceError(error) {
  return error instanceof ServiceError;
}
