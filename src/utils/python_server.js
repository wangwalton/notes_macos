const log = require("electron-log");
const {BACKEND_URL, BACKEND_LOCAL_URL} = require("../main/settings");
const {app} = require("electron");
const path = require("node:path");
const log_ = log.create({logId: "pythonServer"});
log_.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'python.log');
if (!app.isPackaged) {
    log_.transports.file.level = false;
}

const startPythonSubprocess = (db_path, isPackaged) => {
    log_.log("starting python subprocess, db_path=" + db_path);
    const script = isPackaged
        ? path.join(process.resourcesPath, `./pythonBackend/app`)
        : `./pythonBackend/app`;

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
        const resp = await fetch(`${BACKEND_LOCAL_URL}/`);
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {startPythonSubprocess, pollUntilPythonServerIsUp, isPythonServerUp};
// startPythonSubprocess();
