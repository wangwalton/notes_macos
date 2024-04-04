const {
    app,
    BrowserWindow,
    ipcMain,
    session,
    shell,
    Notification,
    Tray,
    Menu,
    dialog,
} = require("electron");
const log = require("electron-log");
if (!app.isPackaged) {
    log.transports.file.level = false;
}

const path = require("node:path");
const {
    LOCAL_BACKEND_URL,
    START_PYTHON_SERVER_OVERRIDE,
    START_LOCAL_HTML_OVERRIDE, FRONTEND_URL, ALLOW_SCREEN_TIME, ALLOW_FILE_SAVE, ALLOW_KEYBOARD_LISTENER,
    REMOTE_BACKEND_URL, LANDING_PAGE_URL
} = require("./settings");
const fs = require("fs");
const activeWindow = require("active-win");
const {systemPreferences} = require("electron");
const {
    updateTrayIconDuration,
    buildTrayMenu,
    startCheckingWorkSessionMinutesLeft,
    endCheckingWorkSessionMinutesLeft
} = require("./tray");
const {getNumFiles, watchAllDirectories} = require("../utils/filesystem");
const {initUserSettings, getUserSettings, refetchUserSettings} = require("./user_settings")

const {
    pollUntilPythonServerIsUp, isPythonServerUp, startPythonServer, killPythonServer,
} = require("../utils/python_server");
const {startPythonTrigger} = require("../utils/python_trigger");
const {notify, notifier} = require("./notif");
const {trackScreenTime} = require("../utils/screen_time");
const {autoUpdater} = require("electron-updater");
const {keyboardListener} = require("../keyboard/keyboard");
var kill = require('tree-kill');
const {verifySignature} = require("electron-updater/out/windowsExecutableCodeSignatureVerifier");
const {verify} = require("../utils/verify_signature");
const {fetchPostFn} = require("../utils/requests");
const {updatePlan, startCheckingSubscription, endCheckingSubscription} = require("./subscription");

startPythonServer()

if (app.isPackaged && (process.env.AUTO_UPDATE || true)) {


    log.info("about to import electron updater")
    const {autoUpdater} = require("electron-updater")
    autoUpdater.logger = log

    const updateHandler = () => {
        autoUpdater.checkForUpdates().then((res) => {
            log.info("checked for updates", res)
        })

    }
    updateHandler()

    setInterval(updateHandler, 5 * 60 * 1000)

    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        const dialogOpts = {
            type: 'info',
            buttons: ['Restart', 'Later'],
            title: 'Application Update',
            message: process.platform === 'win32' ? releaseNotes : releaseName,
            detail:
                'A new version has been downloaded. Restart the application to apply the updates.'
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
            if (returnValue.response === 0) autoUpdater.quitAndInstall()
        })
    })
}

log.info("starting app");
log.errorHandler.startCatching();

const app_name = app.isPackaged ? "joystickai" : "joystickai-dev"
const JWT_TOKEN = app.isPackaged ? "jwtToken" : "devJwtToken";


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
        return win.loadFile(file,);
    } else {
        win.loadURL(`${FRONTEND_URL}/#${urlPath}`);
    }
};

const loadContent = async (win, hasAccess) => {
    const urlPath = hasAccess ? "/electron/work_sessions" : "/electron/initial";

    if (START_LOCAL_HTML_OVERRIDE || app.isPackaged) {
        const file = app.isPackaged ?
            path.join(process.resourcesPath, "frontend/index.html")
            : "frontend/index.html"
        log.info(`loading ${urlPath}`)
        win.loadFile(file, {hash: urlPath});
    } else {
        log.info("loading frontend from url");
        win.webContents.openDevTools();
        win.loadURL(`${FRONTEND_URL}/#${urlPath}`);
    }
};

const hasInitialScreenCapturePermission = async () => {
    const res = systemPreferences.getMediaAccessStatus("screen");
    log.info(`checking inital screen capture flag ${res}`);
    return res === "granted";
}

const hasInitialPrivacyPermission = async () => {
    const res = systemPreferences.isTrustedAccessibilityClient(false);
    log.info(`checking initial accessibility flag: ${res}`)
    return res;
}

const setupIpc = () => {
    ipcMain.handle("hasInitialPrivacyPermission", hasInitialPrivacyPermission);
    ipcMain.handle("hasPrivacyPermission", async () => {
        const appInfo = await activeWindow({
            screenRecordingPermission: false,
        });
        return appInfo.window !== "";
    });
    ipcMain.handle("hasInitialScreenCapturePermission", hasInitialScreenCapturePermission);
    ipcMain.handle("hasScreenCapturePermission", async () => {

        const appInfo = await activeWindow({
            screenRecordingPermission: true,
        });
        return appInfo.title !== "";
    });
    ipcMain.handle("openChromeSignIn", openChromeSignIn);
    ipcMain.handle("refreshUserSettings", refetchUserSettings);
    ipcMain.handle("getNumFiles", (event, ob) => getNumFiles(ob));
    ipcMain.handle("watchFileChanges", async () => {
        await refetchUserSettings()
        watchAllDirectories(getUserSettings()?.settings.file_watcher_settings || [])

    })
    ipcMain.handle("trackScreenTime", () => trackScreenTime.start())
    ipcMain.handle("openUrlInBrowser", (event, data) => {
        log.info("opening chrome from auth");
        shell.openExternal(data);
    });

    ipcMain.handle("echo", (event, data) => {
        return data;
    });
};

let win = null;


app.whenReady().then(async () => {
    win = createWindow();
    win.webContents.on('did-start-loading', () => {
        win.setTitle("Joystick Console" + ' * Loading ....');
        win.setProgressBar(2, {mode: 'indeterminate'}) // second parameter optional
    });

    win.webContents.on('did-stop-loading', () => {
        win.setTitle("Joystick Console");
        win.setProgressBar(-1);
    });

    const hasAccess = await hasInitialPrivacyPermission() && await hasInitialScreenCapturePermission()
    log.info(`hasAccess=${hasAccess}`)
    loadContent(win, hasAccess);
    if (!app.isPackaged) {
        log.info("opendevtools")
        win.webContents.openDevTools();
    }

    await pollUntilPythonServerIsUp();

    setupIpc();
    await initUserSettings();
    buildTrayMenu()

    if (hasAccess && ALLOW_SCREEN_TIME) {
        trackScreenTime.start()
    }
    const userSettings = getUserSettings()?.settings.file_watcher_settings
    // log.info("userSettings", {userSettings})``

    if (ALLOW_FILE_SAVE) watchAllDirectories(userSettings || [])
    startCheckingWorkSessionMinutesLeft(10 * 1000)
    startPythonTrigger();
    startCheckingSubscription(2 * 24 * 60 * 60 * 1000)
    // if (ALLOW_KEYBOARD_LISTENER) {
    //     keyboardListener.start()
    // }
});

app.on('window-all-closed', () => {
    log.info('window-all-closed')
    app.quit()
})


let isQuitting = false;
app.on('before-quit', async (event) => {
    log.info('before-quit')
    if (!isQuitting) {
        isQuitting = true
        event.preventDefault()
        killPythonServer()
        endCheckingWorkSessionMinutesLeft();
        endCheckingSubscription();
        // log.info("killing keyboard listener server");
        // keyboardListener.stop()
        app.quit()
    }
})

app.on("quit", async () => {
    log.info('quit')
});


// Open app from Chrome
app.on("open-url", async (event, url) => {
    log.info("opening app from chrome, url=", url);
    const params = new URL(url);

    if (params.hostname === "verify_license") {
        const token = params.searchParams.get("token")
        const body = Buffer.from(token, 'base64').toString("utf-8")
        const {payload, encrypted, subscription_id} = JSON.parse(body)
        const payloadStr = JSON.stringify(payload)
        const verified = verify(payloadStr, encrypted)

        const oldPlan = getUserSettings().plan
        if (payload.plan !== oldPlan) {
            updatePlan({plan: payload.plan, subscription_id})
            win.reload()
            dialog.showMessageBox(win, {
                type: "info",
                // buttons: ["OK"],
                title: "Welcome",
                message: "Welcome to Joystick Pro!"
            });
        }
        log.info(`verified=${verified}`)

    } else {
        const jwtToken = params.searchParams.get("token");

        fetch(`${LOCAL_BACKEND_URL}/user_setting/delta_update`, {
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
    }

});

const openChromeSignIn = () => {
    log.info("opening chrome from auth");
    shell.openExternal(`${FRONTEND_URL}/electron/auth`);
};

let tray = null;


// app.disableHardwareAcceleration();
if (app.isPackaged) {
    app.setLoginItemSettings({openAtLogin: true})
}
