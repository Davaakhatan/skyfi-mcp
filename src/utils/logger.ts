import winston from 'winston';
import { config } from '@config/index';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output in development
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    config.logging.format === 'json' ? json() : consoleFormat
  ),
  defaultMeta: {
    service: 'skyfi-mcp',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format:
        config.nodeEnv === 'development'
          ? combine(colorize(), consoleFormat)
          : json(),
    }),
    // File transports for production
    ...(config.nodeEnv === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: json(),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: json(),
          }),
        ]
      : []),
  ],
});

// Create logs directory if it doesn't exist (for file transports)
if (config.nodeEnv === 'production') {
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

export default logger;

