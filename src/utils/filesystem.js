const chokidar = require("chokidar");
const fs = require("fs");
const { fetchGetFn, fetchPostFn } = require("./requests");

const getIgnoreFiles = ({
  filepath,
  use_gitignore,
  additionalIgnoredFiles,
}) => {
  const baseIgnoredFiles = [".git/**", ...additionalIgnoredFiles].map(
    (f) => `${filepath}/${f}`
  );

  if (use_gitignore) {
    return baseIgnoredFiles.concat(
      fs
        .readFileSync(`${filepath}/.gitignore`, "utf8")
        .split("\n")
        .map((f) => `${filepath}/${f}`)
    );
  }
  return baseIgnoredFiles;
};

// returns a promise that resolves when number of files exceeds limit
const getNumFiles = (
  ob,
  endDuration = 3000,
  noFileLimit = 100,
  intervalMs = 100
) => {
  const dir = ob.filepath;
  if (!fs.existsSync(path)) {
    return "Invalid directory path";
  }

  const ignoreFiles = getIgnoreFiles(ob);
  let numFiles = 0;
  let lastRecievedFile = new Date();
  const watcher = chokidar.watch(dir, {
    ignored: ignoreFiles,
    followSymlinks: false,
    ignoreInitial: false,
    awaitWriteFinish: true,
    alwaysStat: true,
  });
  watcher.on("add", (event, path) => {
    numFiles += 1;
    lastRecievedFile = new Date();
  });

  // Returns a promise that resolves within endDuration
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (new Date() - lastRecievedFile > noFileLimit) {
        watcher.close();
        clearInterval(interval);
        clearTimeout(timeout);
        resolve(numFiles);
      }
    }, intervalMs);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      watcher.close();
      resolve(numFiles);
    }, endDuration);
  });
};

const watcher = (
  ob,
  file_size_limit = 50 * 1024,
  startupDuration = 5000,
  updateDurationLimit = 2 * 60
) => {
  const eventMapper = {
    add: "A",
    change: "C",
    unlink: "D",
  };
  let isInit = true;
  setTimeout(() => (isInit = false), startupDuration);

  const ignored = getIgnoreFiles(ob);
  const watch = chokidar.watch(ob.filename, {
    ignored,
    followSymlinks: false,
    ignoreInitial: false,
    awaitWriteFinish: true,
    alwaysStat: true,
  });

  const fileLastWatched = {};
  watch.on("all", (event, path, stat) => {
    if (!(event in eventMapper)) return;
    if (stat.size > file_size_limit) return;
    if (stat.isDirectory()) return;
    // Recently uploaded file, so skipping
    if (
      !(path in fileLastWatched) &&
      new Date() - fileLastWatched[path] < updateDurationLimit
    )
      return;

    fileLastWatched[path] = new Date();

    const eventType = isInit ? "S" : eventMapper[event];

    const payload = {
      filename,
      content: fs.readFileSync(path, "utf8"),
      timestamp: new Date().toISOString(),
      mode: eventType,
    };
    fetchPostFn("/file_tracker/create", payload);
  });
  return watch;
};

// Returns a function that closes all watchers
const watchAllDirectories = (obs) => {
  const watches = obs.map(watcher);
  return () => {
    watches.forEach((w) => w.close());
  };
};

// const ob = {
//   filepath: "/Users/yupengwang/dev/waltonwang",
//   use_gitignore: true,
//   additionalIgnoredFiles: [".DS_Store"],
// };

// const a = async () => {
//   const res = await getNumFiles(ob);

//   console.log({ res });
// };
// a();

module.exports = { getNumFiles };
