const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { createLogger } = require("./app/main/logger.cjs");
const { createSettingsStore } = require("./app/main/settingsStore.cjs");

let mainWindow;
let settingsStore;
let logger;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  const userData = app.getPath("userData");

  logger = createLogger(userData);
  settingsStore = createSettingsStore(userData, logger);

  createWindow();

  ipcMain.handle("settings:get", () => settingsStore.load());
  ipcMain.handle("settings:set", (_, data) => settingsStore.save(data));
  ipcMain.handle("settings:applyPreset", (_, name) =>
    settingsStore.applyPreset(name)
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
