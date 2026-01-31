const fs = require('fs');
const path = require('path');

function ts() {
  return new Date().toISOString();
}

function createLogger(logsDir) {
  const file = path.join(logsDir, `run_${Date.now()}.log`);
  function write(level, msg, meta) {
    const line =
      `[${ts()}] [${level}] ${msg}` + (meta ? ` | ${JSON.stringify(meta)}` : '');
    fs.appendFileSync(file, line + '\n', 'utf8');
  }
  return {
    file,
    info: (m, meta) => write('INFO', m, meta),
    warn: (m, meta) => write('WARN', m, meta),
    error: (m, meta) => write('ERROR', m, meta),
  };
}

module.exports = { createLogger };
