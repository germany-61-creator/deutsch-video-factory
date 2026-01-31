const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadSample: () => ipcRenderer.invoke('load-sample'),
  generateScene: () => ipcRenderer.invoke('generate-scene')
});
