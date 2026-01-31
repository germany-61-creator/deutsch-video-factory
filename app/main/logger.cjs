const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (_) {}
}

function ts() {
  return new Date().toISOString();
}

function createLogger(userDataPath) {
  const logsDir = path.join(userDataPath, "logs");
  ensureDir(logsDir);

  const logFile = path.join(logsDir, "app.log");

  function log(event, data) {
    const line =
      `[${ts()}] ${event}` +
      (data ? " " + JSON.stringify(data) : "") +
      "\n";
    fs.appendFileSync(logFile, line, "utf8");
  }

  return {
    info: log,
    file: logFile
  };
}

module.exports = { createLogger };
