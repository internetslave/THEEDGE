const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(value) {
  const level = String(value || 'info').trim().toLowerCase();
  return LOG_LEVELS[level] ? level : 'info';
}

function toErrorMeta(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: error.stack,
  };
}

function maskUsername(username) {
  const value = String(username || '').trim();
  if (!value) return 'unknown';
  if (value.length <= 4) return `${value[0]}***`;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function toRequestMeta(req = {}) {
  return {
    requestId: req.requestId || null,
    method: req.method || null,
    path: req.originalUrl || req.path || null,
    route: req.route?.path || null,
    clientIp: req.clientIp || req.ip || null,
    userAgent: req.headers?.['user-agent'] || null,
    usernameHint: req.username ? maskUsername(req.username) : null,
  };
}

export function createLogger({ level = process.env.LOG_LEVEL || 'info', service = 'edgeiq-api' } = {}) {
  const activeLevel = normalizeLevel(level);

  function shouldLog(nextLevel) {
    return LOG_LEVELS[nextLevel] >= LOG_LEVELS[activeLevel];
  }

  function write(nextLevel, message, meta = {}) {
    if (!shouldLog(nextLevel)) return;
    const entry = {
      ts: new Date().toISOString(),
      level: nextLevel,
      service,
      msg: message,
      ...meta,
    };

    const line = JSON.stringify(entry);
    if (nextLevel === 'error') {
      console.error(line);
    } else if (nextLevel === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug(message, meta) {
      write('debug', message, meta);
    },
    info(message, meta) {
      write('info', message, meta);
    },
    warn(message, meta) {
      write('warn', message, meta);
    },
    error(message, meta) {
      write('error', message, meta);
    },
    child(defaultMeta = {}) {
      return {
        debug: (message, meta) => write('debug', message, { ...defaultMeta, ...(meta || {}) }),
        info: (message, meta) => write('info', message, { ...defaultMeta, ...(meta || {}) }),
        warn: (message, meta) => write('warn', message, { ...defaultMeta, ...(meta || {}) }),
        error: (message, meta) => write('error', message, { ...defaultMeta, ...(meta || {}) }),
      };
    },
  };
}

export const logger = createLogger();
export { maskUsername, toErrorMeta, toRequestMeta };
