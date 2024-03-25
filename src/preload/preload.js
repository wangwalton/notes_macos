const {contextBridge, ipcRenderer} = require("electron");
const settings = require("../main/settings");

contextBridge.exposeInMainWorld("electronAPI", {
    hasInitialPrivacyPermission: () =>
        ipcRenderer.invoke("hasInitialPrivacyPermission"),
    hasPrivacyPermission: () => ipcRenderer.invoke("hasPrivacyPermission"),
    hasInitialScreenCapturePermission: () =>
        ipcRenderer.invoke("hasInitialScreenCapturePermission"),
    hasScreenCapturePermission: () =>
        ipcRenderer.invoke("hasScreenCapturePermission"),
    openChromeSignIn: () => {
        ipcRenderer.invoke("openChromeSignIn");
    },
    refreshUserSettings: () => {
        ipcRenderer.invoke("refreshUserSettings");
    },
    getNumFiles: async (data) => await ipcRenderer.invoke("getNumFiles", data),
    watchFileChanges: () => ipcRenderer.invoke("watchFileChanges"),
    trackScreenTime: () => ipcRenderer.invoke("trackScreenTime"),
    openUrlInBrowser: (data) => ipcRenderer.invoke("openUrlInBrowser", data),
    echo: async (data) => {
        const res = await ipcRenderer.invoke("echo", data);
        return res;
    },

});


