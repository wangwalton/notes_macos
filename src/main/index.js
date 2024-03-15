const {
    app,
    BrowserWindow,
    ipcMain,
    session,
    shell,
    Tray,
    Menu,
    dialog,
} = require("electron");
const path = require("node:path");
const Store = require("electron-store");
const {
    BACKEND_URL,
    FRONTEND_URL,
    START_PYTHON_SERVER_OVERRIDE,
    START_LOCAL_HTML_OVERRIDE,
    BACKEND_LOCAL_URL
} = require("./settings");
const fs = require("fs");
const activeWindow = require("active-win");
const {systemPreferences} = require("electron");
const {api, openSystemPreferences} = require("electron-util");
const {updateTrayIconDuration} = require("./tray");
const {getNumFiles, watchAllDirectories} = require("../utils/filesystem");
const {userSettings: {initUserSettings, getUserSettings, refetchUserSettings}} = require("./user_settings")
const {
    hasScreenCapturePermission,
    hasPromptedForPermission,
} = require("mac-screen-capture-permissions");

const {
    startPythonSubprocess,
    pollUntilPythonServerIsUp, isPythonServerUp,
} = require("../utils/python_server");
const log = require("electron-log");

log.info("about to import electron updater")
const {autoUpdater} = require("electron-updater")
autoUpdater.logger = log
autoUpdater.checkForUpdatesAndNotify()
log.info("checked for updates")


log.errorHandler.startCatching();

const app_name = "immersed";
const JWT_TOKEN = app.isPackaged ? "jwtToken" : "devJwtToken";

const store = new Store();

const createWindow = () => {
    const win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            nodeIntegration: true,
            // partition: "persist:MyAppSomethingUnique",
        },
        width: 800 * 2,
        height: 1500,
    });
    buildTray(!!store.get(JWT_TOKEN));

    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(app_name, process.execPath, [
                path.resolve(process.argv[1]),
            ]);
        }
    } else {
        app.setAsDefaultProtocolClient(app_name);
    }

    // // Open all new window a href in chrome
    // win.webContents.setWindowOpenHandler(({ url }) => {
    //   shell.openExternal(url);
    //   return { action: "deny" };
    // });
    return win;
};

const loadLoadingScreen = (win) => {
    const urlPath = "/persisstent_load"
    if (START_LOCAL_HTML_OVERRIDE || app.isPackaged) {
        const file = app.isPackaged ?
            path.join(process.resourcesPath, "frontend/index.html")
            : "frontend/index.html"
        return win.loadFile(file, {search: urlPath});
    } else {
        win.loadURL(`http://localhost:5173/#${urlPath}`);
    }
};

const loadContent = (win) => {
    const hasPrivacy = systemPreferences.isTrustedAccessibilityClient(false);
    const urlPath = hasPrivacy ? "/electron/work_sessions" : "/electron/initial";

    if (START_LOCAL_HTML_OVERRIDE || app.isPackaged) {
        const file = app.isPackaged ?
            path.join(process.resourcesPath, "frontend/index.html")
            : "frontend/index.html"
        win.loadFile(file, {search: urlPath});
    } else {
        log.info("loading frontend from url");
        win.webContents.openDevTools();
        win.loadURL(`http://localhost:5173/#${urlPath}`);
    }
};

const setupIpc = () => {
    ipcMain.handle("hasInitialPrivacyPermission", async () => {
        const res = systemPreferences.isTrustedAccessibilityClient(false);
        log.info(`checking initial accessibility flag: ${res}`)
        return res;
    });
    ipcMain.handle("hasPrivacyPermission", async () => {
        const appInfo = await activeWindow({
            screenRecordingPermission: false,
        });
        return appInfo.window !== "";
    });
    ipcMain.handle("openPrivacyPermission", async () => {
        const res = openSystemPreferences("security", "Privacy_Accessibility");
        // log.info(res);
        return res;
    });
    ipcMain.handle("hasInitialScreenCapturePermission", async () => {
        const res = systemPreferences.getMediaAccessStatus("screen");
        log.info(`checking inital screen capture flag ${res}`);
        return res === "granted";
    });
    ipcMain.handle("hasScreenCapturePermission", async () => {

        const appInfo = await activeWindow({
            screenRecordingPermission: true,
        });
        return appInfo.title !== "";
    });
    ipcMain.handle("openScreenCapturePermission", () => {
        const res = openSystemPreferences("security", "Privacy_ScreenCapture");
        // log.info(res);
        return res;
    });

    ipcMain.handle("openChromeSignIn", openChromeSignIn);
    ipcMain.handle("refreshUserSettings", refetchUserSettings);
    ipcMain.handle("getNumFiles", (event, ob) => getNumFiles(ob));
    ipcMain.handle("watchFileChanges", async () => {
        await refetchUserSettings()
        watchAllDirectories(getUserSettings()?.file_watcher_settings || [])

    })

    ipcMain.handle("echo", (event, data) => {
        return data;
    });
};


let pythonPID = null;
app.whenReady().then(async () => {
    const win = createWindow();
    loadLoadingScreen(win);

    setupIpc();
    // If server is already running, we'll use that one.
    if (START_PYTHON_SERVER_OVERRIDE || app.isPackaged) {
        pythonPID = startPythonSubprocess(
            app.getPath("userData") + "/python_server.sqlite3",
            app.isPackaged
        );
        await pollUntilPythonServerIsUp();

        log.info("successfully started python subprocess, pid=" + pythonPID);
    }
    await initUserSettings();


    loadContent(win);
    startPixel();
    watchAllDirectories(getUserSettings()?.file_watcher_settings || [])
    setInterval(() => updateTrayIconDuration(tray), 1000 * 10);
});

app.on("quit", function () {
    if (pythonPID) {
        pythonPID.kill();
    }
});

// Open app from Chrome
app.on("open-url", (event, url) => {
    log.info("opening app from chrome, url=", url);
    const params = new URL(url);
    const jwtToken = params.searchParams.get("token");
    fetch(`http://127.0.0.1:5001/user_setting/delta_update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            cloud_user_token: jwtToken,
        }),
    }).then(async (res) => {
        log.info(await res.text());
    });
});

const openChromeSignIn = () => {
    log.info("opening chrome from auth");
    shell.openExternal(`${FRONTEND_URL}/auth/electron`);
};

let tray = null;

function buildTray(isSignedIn) {
    if (tray == null) {
        const assetsPath = app.isPackaged
            ? path.join(process.resourcesPath, "assets")
            : "assets";

        tray = new Tray(`${assetsPath}/tray_icon.png`);
        // tray.setTitle("Immersed");
    }

    const contextMenu = Menu.buildFromTemplate([]);
    tray.setContextMenu(contextMenu);
}

const startPixel = (
    pollIntervalSeconds = 2 * 1000,
    uploadIntervalSeconds = 10 * 1000
) => {
    if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        return false;
    }
    log.info("starting screen time tracking");
    let currentData = [];

    const pollAppItems = async () => {
        log.debug("polling screen time data...");

        const appInfo = await activeWindow({
            screenRecordingPermission: true,
        });
        if ((!appInfo) || !("owner" in appInfo)) {
            log.info("no owner in appInfo, appInfo", appInfo);
            return;
        }

        const newItem = {
            app_name: appInfo.owner.name,
            window_title: appInfo.title,
            url: appInfo.url,
            time: new Date().toISOString(),
        };
        const last = currentData[currentData.length - 1];

        if (
            last &&
            last.app_name === newItem.app_name &&
            last.window_title === newItem.window_title &&
            last.url === newItem.url
        ) {
            return;
        }

        currentData.push(newItem);
    };

    const uploadScreenTime = () => {
        const url = `${BACKEND_LOCAL_URL}/screen_time/bulk_create`;
        log.info("uploading screen time... url=" + url);
        const data = currentData;
        currentData = [];

        if (data.length === 0) {
            log.debug("no data to upload, skipping...");
            return;
        }

        fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({app_items: data}),
        })
            .then((res) => res.text())
            .catch((error) => {
                log.info(error);
            })
            .then((text) => {
                log.info("bulk create response", text);
            })
            .catch((error) => {
                log.info(error);
            });
        log.debug("uploading screen time... done");
    };
    setInterval(pollAppItems, pollIntervalSeconds);
    setInterval(uploadScreenTime, uploadIntervalSeconds);
};
app.disableHardwareAcceleration();
