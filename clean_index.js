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

const activeWindow = require("active-win");

const log = require("electron-log");
log.errorHandler.startCatching();

const app_name = "immersed";
const JWT_TOKEN = "jwtToken";

const storeConfig = {};
if (!app.isPackaged) {
  storeConfig["cwd"] = "dev";
}
const store = new Store();

log.info("logging all store state: ", store.store);
if (!app.isPackaged) {
  console.log("is not packaged");
  store.set(
    JWT_TOKEN,
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjU2MDRiOTdlOTk5NGRhYmY4Y2FhZTY1In0.U0bUqw6rGoVQ-MPy32uiKJgT2M5G16-fIXe0Ym3Vd7M"
  );
}
log.info("ok");
const createWindow = () => {
  // const win = new BrowserWindow({
  //   webPreferences: {
  //     preload: path.join(__dirname, "preload.js"),
  //     nodeIntegration: true,
  //     // partition: "persist:MyAppSomethingUnique",
  //   },
  //   width: 800,
  //   height: 1500,
  // });
  buildTray(!!store.get(JWT_TOKEN));
  startPixel();

  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["<all_urls>"],
    },
    (details, callback) => {
      // Modify request headers here
      details.requestHeaders["Cookie"] = "";
      details.requestHeaders.Cookie = `notlaw_user_jwt=${store.get(JWT_TOKEN)}`;

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

  // win.loadFile("index.html");
  // // Open all new window a href in chrome
  // win.webContents.setWindowOpenHandler(({ url }) => {
  //   shell.openExternal(url);
  //   return { action: "deny" };
  // });
  // win.webContents.openDevTools();
};

app.whenReady().then(createWindow);

app.on("open-url", (event, url) => {
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
    tray.setTitle("Immersed");
  }

  const loggedOutMenu = Menu.buildFromTemplate([
    {
      label: "Sign In",
      click: () => {
        shell.openExternal(`${FRONTEND_URL}/auth/electron`);
      },
    },
  ]);

  const authedMemu = Menu.buildFromTemplate([
    {
      label: "Sign Out",
      click: () => {
        store.delete(JWT_TOKEN);
        tray.setContextMenu(loggedOutMenu);
      },
    },
  ]);

  const contextMenu = isSignedIn ? authedMemu : loggedOutMenu;
  tray.setContextMenu(contextMenu);
}

const startPixel = (
  pollIntervalSeconds = 2 * 1000,
  uploadIntervalSeconds = 10 * 1000
) => {
  let currentData = [];
  const pollAppItems = async () => {
    if (store.get(JWT_TOKEN)) {
      const appInfo = await activeWindow({
        // screenRecordingPermission: false,
      });

      // console.log(appInfo);
      currentData.push({
        app_name: appInfo.owner.name,
        window_title: appInfo.title,
        metadata: {
          url: appInfo.url,
        },
        time: new Date().toISOString(),
      });
    }
  };

  const uploadScreenTime = () => {
    const data = currentData;
    currentData = [];

    if (data.length === 0) {
      console.log("pixel data empty");
      return;
    }

    console.log(`${BACKEND_URL}/screen_time/bulk_create`);

    fetch(`${BACKEND_URL}/screen_time/bulk_create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `notlaw_user_jwt=${store.get(JWT_TOKEN)}`,
      },
      body: JSON.stringify({ app_items: data }),
    })
      .then((res) => res.text())
      .then((text) => {
        console.log(text);
      })
      .catch((error) => {
        console.log(error);
      });
  };
  setInterval(pollAppItems, pollIntervalSeconds);
  setInterval(uploadScreenTime, uploadIntervalSeconds);
};
