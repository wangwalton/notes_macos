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
const { BACKEND_URL, FRONTEND_URL } = require("./settings");
const fs = require("fs");
const activeWindow = require("active-win");
const { systemPreferences } = require("electron");
const { api, openSystemPreferences } = require("electron-util");
const { updateTrayIconDuration } = require("./src/tray");
const { getNumFiles } = require("./src/utils/filesystem");

const {
  hasScreenCapturePermission,
  hasPromptedForPermission,
} = require("mac-screen-capture-permissions");

const {
  startPythonSubprocess,
  pollUntilPythonServerIsUp,
} = require("./python_server");
const {
  getUserSetting,
  refreshUserSettings,
  constants: { IS_CLOUD, USE_BUNDLED_BACKEND, USE_BUNDLED_FRONTEND },
} = require("./src/user_settings");

const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

log.errorHandler.startCatching();

const app_name = "immersed";
const JWT_TOKEN = app.isPackaged ? "jwtToken" : "devJwtToken";

const store = new Store();

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
  // win.webContents.openDevTools();
  return win;
};

const loadLoadingSCreen = (win) => {
  if (getUserSetting(USE_BUNDLED_FRONTEND)) {
    return;
  } else {
    win.loadURL(`${FRONTEND_URL}/#/persistent_load`);
  }
};

const loadContent = (win) => {
  const hasPrivacy = systemPreferences.isTrustedAccessibilityClient(false);
  const path = hasPrivacy ? "/electron/work_sessions" : "/electron/initial";
  if (getUserSetting(USE_BUNDLED_FRONTEND)) {
    win.loadFile("frontend/index.html", { path });
    win.webContents.openDevTools();
  } else {
    log.info("loading frontend from url");
    win.loadURL(`${FRONTEND_URL}/#${path}`);
  }
};

const setupIpc = () => {
  ipcMain.handle("hasPrivacyPermission", async () => {
    const res = systemPreferences.isTrustedAccessibilityClient(false);
    return res;
  });
  ipcMain.handle("openPrivacyPermission", async () => {
    const res = openSystemPreferences("security", "Privacy_Accessibility");
    log.info(res);
    return res;
  });
  ipcMain.handle("hasInitialScreenCapturePermission", async () => {
    const res = systemPreferences.getMediaAccessStatus("screen");
    log.info("screen: " + res);
    return res === "granted";
  });
  ipcMain.handle("hasScreenCapturePermission", async () => {
    // const res = systemPreferences.getMediaAccessStatus("screen");
    // log.info("screen: " + res);
    const appInfo = await activeWindow({
      screenRecordingPermission: true,
    });
    // console.log(appInfo);
    return appInfo.title !== "";
  });
  ipcMain.handle("openScreenCapturePermission", () => {
    const res = openSystemPreferences("security", "Privacy_ScreenCapture");
    log.info(res);
    return res;
  });

  ipcMain.handle("openChromeSignIn", openChromeSignIn);
  ipcMain.handle("refreshUserSettings", refreshUserSettings);
  ipcMain.handle("getNumFiles", (event, ob) => getNumFiles(ob));
  ipcMain.handle("echo", (event, data) => {
    console.log(data);
    throw new Error("echo error");
    return data;
  });
};

let pythonPID = null;
app.whenReady().then(async () => {
  const win = createWindow();
  loadLoadingSCreen(win);

  setupIpc();
  if (getUserSetting(USE_BUNDLED_BACKEND)) {
    pythonPID = startPythonSubprocess(
      app.getPath("userData") + "/python_server.sqlite3"
    );
    await pollUntilPythonServerIsUp();

    log.info("successfully started python subprocess, pid=" + pythonPID);
  }
  loadContent(win);
  startPixel();
  setInterval(() => updateTrayIconDuration(tray), 1000 * 30);
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
  fetch(`http://127.0.0.1:5000/user_setting/delta_update`, {
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
  log.info("starting all tracking activities...");
  let currentData = [];

  const pollAppItems = async () => {
    log.debug("polling screen time data...");

    const appInfo = await activeWindow({
      screenRecordingPermission: true,
    });
    if (!("owner" in appInfo)) {
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
    const url = `${BACKEND_URL}/screen_time/bulk_create`;
    log.info("uploading screen time... url=" + url);
    const data = currentData;
    currentData = [];

    if (data.length === 0) {
      log.debug("no data to upload, skipping...");
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_items: data }),
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
