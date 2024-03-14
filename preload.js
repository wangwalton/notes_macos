const { contextBridge, ipcRenderer } = require("electron");
const settings = require("./settings");

contextBridge.exposeInMainWorld("electronAPI", {
  hasPrivacyPermission: () => ipcRenderer.invoke("hasPrivacyPermission"),
  openPrivacyPermission: () => {
    ipcRenderer.invoke("openPrivacyPermission");
  },
  hasInitialScreenCapturePermission: () =>
    ipcRenderer.invoke("hasInitialScreenCapturePermission"),
  hasScreenCapturePermission: () =>
    ipcRenderer.invoke("hasScreenCapturePermission"),
  openScreenCapturePermission: () => {
    ipcRenderer.invoke("openScreenCapturePermission");
  },
  openChromeSignIn: () => {
    ipcRenderer.invoke("openChromeSignIn");
  },
  refreshUserSettings: () => {
    ipcRenderer.invoke("refreshUserSettings");
  },
  getNumFiles: async () => await ipcRenderer.invoke("getNumFiles"),
  echo: async (data) => {
    const res = await ipcRenderer.invoke("echo", data);
    return res;
  },
});
