const {contextBridge, ipcRenderer} = require("electron");
const settings = require("../main/settings");

contextBridge.exposeInMainWorld("electronAPI", {
    hasInitialPrivacyPermission: () =>
        ipcRenderer.invoke("hasInitialPrivacyPermission"),
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
    getNumFiles: async (data) => await ipcRenderer.invoke("getNumFiles", data),
    watchFileChanges: () => ipcRenderer.invoke("watchFileChanges"),
    trackScreenTime: () => ipcRenderer.invoke("trackScreenTime"),
    echo: async (data) => {
        const res = await ipcRenderer.invoke("echo", data);
        return res;
    },
});


