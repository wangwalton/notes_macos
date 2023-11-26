const { contextBridge, ipcRenderer } = require("electron");
const settings = require("./settings");
contextBridge.exposeInMainWorld("electronAPI", {
  setTitle: (title) => ipcRenderer.send("set-title", title),
  settings: settings,
});
