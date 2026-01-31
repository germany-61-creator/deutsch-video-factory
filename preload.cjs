const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsAPI", {
  get: () => ipcRenderer.invoke("settings:get"),
  set: (s) => ipcRenderer.invoke("settings:set", s),
  applyPreset: (p) => ipcRenderer.invoke("settings:applyPreset", p)
});
