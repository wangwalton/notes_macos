const log = require("electron-log");
const {LOCAL_BACKEND_URL, LOCAL_BACKEND_PORT} = require("../main/settings");
const {app} = require("electron");
const path = require("node:path");
const {exec} = require('child_process');

const log_ = log.create({logId: "pythonServer"});
log_.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'python.log');
if (!app.isPackaged) {
    log_.transports.file.level = false;
}

// Function to execute a shell command and return a promise
const execPromise = (cmd) => new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            reject(error);
            return;
        }
        if (stderr) {
            reject(stderr);
            return;
        }
        resolve(stdout.trim());
    });
});

// Main function to find and kill processes
const killProcessesOnPort = async (port) => {
    try {
        log_.info("Looking for processes on port " + port + " to kill...");
        const findProcessCmd = `lsof -i tcp:${port} | awk 'NR!=1 {print $2}' | uniq`;
        const pids = await execPromise(findProcessCmd);
        log_.info(`Found following processes on port ${port}: ${pids}`);

        const killPromises = pids.split('\n').map(pid => {
            if (!pid || isNaN(pid)) return Promise.resolve();
            const killCmd = `kill -9 ${pid}`;
            return execPromise(killCmd).then(() => console.log(`Process ${pid} killed successfully.`));
        });

        await Promise.all(killPromises);

        log_.info('All processes have been killed.');
    } catch (err) {
        log_.error(`Error: ${err}`);
    }
};

const startPythonSubprocess = async (db_path, log_path, isPackaged) => {
    await killProcessesOnPort(LOCAL_BACKEND_PORT)
    const script = isPackaged
        ? path.join(process.resourcesPath, `./pythonBackend/app`)
        : `./pythonBackend/app`;
    const args = ["--dbpath", db_path, "--logpath", log_path]
    log_.log("starting python subprocess, args=" + JSON.stringify(args));
    const child = require("child_process").execFile(script, ["--dbpath", db_path, "--logpath", log_path]);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", function (data) {
        log_.log(data + "\r");
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", function (data) {
        log_.log(data + "\r");
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
        const resp = await fetch(`${LOCAL_BACKEND_URL}/`);
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {startPythonSubprocess, pollUntilPythonServerIsUp, isPythonServerUp};
// startPythonSubprocess();
