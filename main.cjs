const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const { getRootDirs } = require('./app/core/paths/paths.cjs');
const { createLogger } = require('./app/core/log/logger.cjs');
const { JobManager } = require('./app/core/jobs/jobManager.cjs');

let logger;
let jobs;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  const dirs = getRootDirs(fs);
  logger = createLogger(dirs.logsDir);
  jobs = new JobManager(logger);
  logger.info('APP_READY', { userData: dirs.userData, exportsDir: dirs.exportsDir });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC: load sample.json ---
ipcMain.handle('load-sample', async () => {
  const data = fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8');
  return JSON.parse(data);
});

// --- IPC: generate first scene PNG ---
ipcMain.handle('generate-scene', async () => {
  // 1) scene output folder
  const scenesDir = path.join(__dirname, 'scenes');
  if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });

  // 2) read sample.json
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8'));
  const scene = data.dialogue && data.dialogue[0] ? data.dialogue[0] : null;
  if (!scene) throw new Error('sample.json içinde dialogue[0] bulunamadı');

  // 3) generate image
  const { generateScenePng } = require('./app/core/sceneGenerator.cjs');
  const outPath = path.join(scenesDir, 'scene1.png');
  generateScenePng(scene, outPath);

  logger && logger.info('SCENE_GENERATED', { file: outPath });

  return { ok: true, file: outPath };
});
