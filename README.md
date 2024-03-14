
## Code backups

Cookie handling
```
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["<all_urls>"],
    },
    (details, callback) => {
      // Modify request headers here
      if (getUserSetting(IS_CLOUD)) {
        details.requestHeaders["Cookie"] = "";
        details.requestHeaders.Cookie = `notlaw_user_jwt=${store.get(
          JWT_TOKEN
        )}`;
      }
      // Call the callback function with the updated headers
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );
```

Tray Building
```
  const loggedOutMenu = [
    {
      label: "Sign In",
      click: openChromeSignIn,
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
```

Watch Directories
```
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
```