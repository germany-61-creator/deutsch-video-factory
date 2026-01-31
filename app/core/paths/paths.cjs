const path = require('path');
const { app } = require('electron');

function ensureDir(fs, p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getRootDirs(fs) {
  const userData = app.getPath('userData');
  const logsDir = path.join(userData, 'logs');
  const exportsDir = path.join(userData, 'exports');
  ensureDir(fs, logsDir);
  ensureDir(fs, exportsDir);
  return { userData, logsDir, exportsDir };
}

module.exports = { getRootDirs };
