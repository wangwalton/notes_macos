const log = require("electron-log");
const { BACKEND_URL, FRONTEND_URL } = require("./settings");
const log_ = log.create({ logId: "pythonServer" });

const startPythonSubprocess = (db_path) => {
  log_.log("starting python subprocess, db_path=" + db_path);
  const script = `./pythonBackend/app/app`;
  const child = require("child_process").spawn(script, ["--dbpath", db_path]);

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", function (data) {
    log_.log("stdout: " + data);
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", function (data) {
    log_.log("stdout: " + data);
  });

  return child;
};

const pollUntilPythonServerIsUp = async () => {
  const tries = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  for (const seconds of tries) {
    log_.log(
      "trying to connect to python server, waiting for " + seconds + " seconds"
    );
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    if (await isPythonServerUp()) {
      log_.log("python server is up");
      return;
    }
  }
};
const isPythonServerUp = async () => {
  try {
    const resp = await fetch(`${BACKEND_URL}/`);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = { startPythonSubprocess, pollUntilPythonServerIsUp };
// startPythonSubprocess();
