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
const { watcher } = require("./fs_watcher");
const activeWindow = require("active-win");
const {
  startPythonSubprocess,
  pollUntilPythonServerIsUp,
} = require("./python_server");
const {
  IS_CLOUD,
  USE_BUNDLED_BACKEND,
  USE_BUNDLED_FRONTEND,
} = require("./config");
const log = require("electron-log");
const { getHeaders } = require("./utils");
log.errorHandler.startCatching();

const app_name = "immersed";
const JWT_TOKEN = app.isPackaged ? "jwtToken" : "devJwtToken";

const storeConfig = {};
if (!app.isPackaged) {
  storeConfig["cwd"] = "dev";
}
const store = new Store();
// TO BE MOVED TO CONFIG
const DIRECTORIES_TO_WATCH = [
  "/Users/yupengwang/dev/waltonwang",
  "/Users/yupengwang/dev/waltonwang-ui",
  "/Users/yupengwang/dev/notes_macos",
];

// DIRECTORIES_TO_WATCH.map((folder) => {
//   const ignoredFiles = fs
//     .readFileSync(`${folder}/.gitignore`, "utf8")
//     .split("\n")
//     .concat([".git/**"])
//     .map((f) => `${folder}/${f}`);
//   watcher(
//     folder,
//     ignoredFiles,
//     // [folder + "/" + ".git/**"],
//     () => store.get(JWT_TOKEN)
//   );
// });

if (!app.isPackaged) {
  log.info("is not packaged");
  if (IS_CLOUD) {
    store.set(
      JWT_TOKEN,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxfQ.jYyRJbb0WImFoUUdcslQQfwnXTHJzne-6tsPd8Hrw0I"
    );
  }
}
const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      // partition: "persist:MyAppSomethingUnique",
    },
    width: 800,
    height: 1500,
  });
  buildTray(!!store.get(JWT_TOKEN));

  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["<all_urls>"],
    },
    (details, callback) => {
      // Modify request headers here
      if (IS_CLOUD) {
        details.requestHeaders["Cookie"] = "";
        details.requestHeaders.Cookie = `notlaw_user_jwt=${store.get(
          JWT_TOKEN
        )}`;
      }
      // Call the callback function with the updated headers
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

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
  win.webContents.openDevTools();

  if (USE_BUNDLED_FRONTEND) {
    return;
  } else {
    win.loadURL(`${FRONTEND_URL}/persistent_load`);
  }
};

const loadContent = (win) => {
  if (USE_BUNDLED_FRONTEND) {
    win.loadFile("frontend/index.html", { path: "/" });
  } else {
    win.loadURL(`${FRONTEND_URL}/`);
  }
};

let pythonPID = null;
app.whenReady().then(async () => {
  const win = createWindow();
  loadLoadingSCreen(win);

  if (USE_BUNDLED_BACKEND) {
    pythonPID = startPythonSubprocess(
      app.getPath("userData") + "/python_server.sqlite3"
    );
    await pollUntilPythonServerIsUp();

    log.info("successfully started python subprocess, pid=" + pythonPID);
  }
  startPixel();
  loadContent(win);
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

  store.set(JWT_TOKEN, jwtToken);
  buildTray(true);

  // dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`);
});

let tray = null;
function buildTray(isSignedIn) {
  if (tray == null) {
    const assetsPath = app.isPackaged
      ? path.join(process.resourcesPath, "assets")
      : "assets";

    tray = new Tray(`${assetsPath}/tray_icon.png`);
    // tray.setTitle("Immersed");
  }

  const loggedOutMenu = [
    {
      label: "Sign In",
      click: () => {
        shell.openExternal(`${FRONTEND_URL}/auth/electron`);
      },
    },
  ];

  const authedMemu = [
    {
      label: "Sign Out",
      click: () => {
        store.delete(JWT_TOKEN);
        tray.setContextMenu(loggedOutMenu);
      },
    },
  ];
  const menu = isSignedIn ? authedMemu : loggedOutMenu;

  const contextMenu = Menu.buildFromTemplate(menu.concat([]));
  tray.setContextMenu(contextMenu);
}

const startPixel = (
  pollIntervalSeconds = 2 * 1000,
  uploadIntervalSeconds = 10 * 1000
) => {
  log.info("starting all tracking activities...");
  let currentData = [];
  const pollAppItems = async () => {
    log.debug("polling screen time data...");
    if (IS_CLOUD && !store.get(JWT_TOKEN)) {
      log.info("using cloud and no jwt token, skipping...");
      return;
    }
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
      log.info("no data to upload, skipping...");
      return;
    }

    fetch(url, {
      method: "POST",
      headers: getHeaders(store.get(JWT_TOKEN)),
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
    log.info("uploading screen time... done");
  };
  setInterval(pollAppItems, pollIntervalSeconds);
  setInterval(uploadScreenTime, uploadIntervalSeconds);
  setInterval(updateTrayIconDuration, 1000 * 30);
};

const updateTrayIconDuration = async () => {
  const minutesLeft = await getCurrentWorkSessionTime();
  if (minutesLeft === null) {
    tray.setTitle("");
  } else {
    tray.setTitle(Math.ceil(minutesLeft).toString());
  }
};

const getCurrentWorkSessionTime = async () => {
  const currentWorkSession = await getCurrentWorkSession();
  if (currentWorkSession.id === undefined) {
    return null;
  }
  const minutesLeft =
    (new Date(currentWorkSession.end_time) - new Date()) / 1000 / 60;
  return minutesLeft;
};

const getCurrentWorkSession = async () => {
  console.log(`${BACKEND_URL}/work_session/current`);
  return fetch(`${BACKEND_URL}/work_session/current`, {
    method: "GET",
    headers: getHeaders(store.get(JWT_TOKEN)),
  })
    .then((res) => res.json())
    .then((res) => {
      return res;
    })
    .catch((error) => {
      log.info(error);
    });
};

app.on("quit", function () {
  // do some additional cleanup
});
