const chokidar = require("chokidar");
const { BACKEND_URL, FRONTEND_URL } = require("./settings");
const fs = require("fs");

const INIT_DURATION = 1000;
const FILE_SIZE_LIMIT = 50 * 1024; // Don't track files over 50 kB
let isInit = true;
setTimeout(() => (isInit = false), INIT_DURATION);

const eventMapper = {
  add: "A",
  change: "C",
  unlink: "D",
};

console.log("addDir" in Object.keys(eventMapper));
const watcher = (dir, ignored, api_token) => {
  // One-liner for current directory
  chokidar
    .watch(dir, {
      ignored,
      followSymlinks: false,
      ignoreInitial: false,
      awaitWriteFinish: true,
      alwaysStat: true,
    })
    .on("all", (event, path, stat) => {
      if (!(event in eventMapper)) return;
      if (stat.size > FILE_SIZE_LIMIT) return;
      if (stat.isDirectory()) return;

      const eventType = isInit ? "S" : eventMapper[event];

      const filename = `${path}`;
      const payload = {
        filename,
        content: fs.readFileSync(filename, "utf8"),
        timestamp: new Date().toISOString(),
        mode: eventType,
      };

      console.log(event, path, stat.size);
      console.log(`${BACKEND_URL}/file_tracker/create`);
      //   fetch(`${BACKEND_URL}/file_tracker/create`, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       Cookie: `notlaw_user_jwt=${api_token}`,
      //     },
      //     body: JSON.stringify(payload),
      //   })
      //     .then((res) => res.text())
      //     .then((text) => {
      //       console.log(text);
      //     });
    });
};

const foldersToWatch = ["/Users/yupengwang/dev/waltonwang"];
foldersToWatch.map((folder) => {
  // console.log(
  //   fs.readFileSync(`${folder}/.gitignore`, "utf8").split("\n") + [".git"]
  // )
  const ignoredFiles = fs
    .readFileSync(`${folder}/.gitignore`, "utf8")
    .split("\n")
    .concat([".git/**"])
    .map((f) => `${folder}/${f}`);
  watcher(
    folder,
    // fs.readFileSync(`${folder}/.gitignore`, "utf8").split("\n") + [".git/**"],
    ignoredFiles,
    // [folder + "/" + ".git/**"],
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjU2MzA0YzU1YmVlM2U0MDM3MzY4ZmEzIn0.CtMjBHbjg-KrDbOJwRKcyIN5Hz1V9ln7U2dfpoY1lfc"
  );
});

// module.exports = watcher;
