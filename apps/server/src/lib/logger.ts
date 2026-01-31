/**
 * Simple structured logger for the API. Logs as JSON so production
 * (e.g. Cloudflare Workers real-time logs / tail) can filter and search.
 * Avoid logging sensitive data (cookies, tokens, full headers).
 */

type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function log(level: LogLevel, message: string, data?: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(data && Object.keys(data).length > 0 ? data : {}),
  };
  const line = JSON.stringify(entry);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info(message: string, data?: LogPayload) {
    log("info", message, data);
  },
  warn(message: string, data?: LogPayload) {
    log("warn", message, data);
  },
  error(message: string, data?: LogPayload) {
    log("error", message, data);
  },
};
