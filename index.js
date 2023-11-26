const applescript = require("applescript");
const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("node:path");

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("electron-fiddle", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("electron-fiddle");
}

function getActiveApp() {
  const script = `
tell application "System Events"
    set appProc to first application process whose frontmost is true
    
    set app_name to bundle identifier of appProc

    return app_name
end tell
    `;

  applescript.execString(script, (err, result) => {
    if (err) {
      console.error("Error:", err);
      return;
    }

    console.log(`The active application is: ${result}`);
  });
}

function fetchActiveAppEverySecond() {
  getActiveApp();
  setTimeout(fetchActiveAppEverySecond, 1000); // Fetch every second (1000 milliseconds)
}

const logCookies = () => {
  session.defaultSession.cookies
    .get({})
    .then((cookies) => {
      console.log(
        cookies.map((c) => c.domain).filter((v) => !v.includes("google"))
      );
    })
    .catch((error) => {
      console.log(error);
    });
};
console.log(path.join(__dirname, "preload.js"));

const a123 = function () {
  console.log("start");
  session.defaultSession.cookies.flushStore();
};
function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      // preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      // partition: "persist:MyAppSomethingUnique",

      session: session.fromPartition("persist:my-session", {
        // Set the partition to 'persist:my-session' for persistence
        cache: true, // Enable caching
        cookies: true, // Enable cookies
      }),
    },
    width: 800,
    height: 1500,
  });

  ipcMain.on("set-title", (event, title) => {
    const webContents = event.sender;
    console.log(title);
    const win = BrowserWindow.fromWebContents(webContents);
    win.setTitle(title);
  });
  // win.loadFile("index.html");

  win.loadURL("https://notes.joystickai.com/");
  win.webContents.openDevTools();
  // win.on("did-start-navigation", function () {
  //   console.log("start");
  //   session.defaultSession.cookies.flushStore();
  // });

  // const contents = win.webContents;
  // console.log(contents);
  // setInterval(logCookies, 2000);

  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log(url);
    shell.openExternal(url);
    return { action: "deny" };
  });
}
app.whenReady().then(createWindow);
app.on("open-url", (event, url) => {
  dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`);
});
