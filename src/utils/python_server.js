const log = require("electron-log");
const {LOCAL_BACKEND_URL, LOCAL_BACKEND_PORT, START_PYTHON_SERVER_OVERRIDE} = require("../main/settings");
const {app} = require("electron");
const path = require("node:path");
const {exec} = require('child_process');
const kill = require("tree-kill");

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
        log.info("Looking for processes on port " + port + " to kill...");
        const findProcessCmd = `lsof -i tcp:${port} | awk 'NR!=1 {print $2}' | uniq`;
        const pids = await execPromise(findProcessCmd);
        log.info(`Found following processes on port ${port}: ${pids}`);

        const killPromises = pids.split('\n').map(pid => {
            if (!pid || isNaN(pid)) return Promise.resolve();
            const killCmd = `kill -9 ${pid}`;
            return execPromise(killCmd).then(() => console.log(`Process ${pid} killed successfully.`));
        });

        await Promise.all(killPromises);

        log.info('All processes have been killed.');
    } catch (err) {
        log.error(`Error: ${err}`);
    }
};
let pythonPID = null;

const startPythonServer = async () => {
    if (START_PYTHON_SERVER_OVERRIDE || app.isPackaged) {
        let dbPath = app.getPath("userData") + "/python_server.sqlite3";
        let logPath = app.getPath("logs") + "/python_server.log";

        if (!app.isPackaged) {
            logPath = app.getPath("userData") + "/python_server.dev.log"
        }
        pythonPID = await startPythonSubprocess(
            dbPath,
            logPath,
            app.isPackaged
        );
        // await pollUntilPythonServerIsUp();
        log.info("successfully started python subprocess, pid=" + pythonPID.pid);
    }
}

const killProcessTree = pid => new Promise((resolve, reject) => {
    kill(pid, 'SIGKILL', (err) => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    });
});

const killPythonServer = async () => {
    if (pythonPID) {
        log.info("killing python server", pythonPID.pid);
        log.info("awaiting killing process tree")
        const pythonKiller = await killProcessTree(pythonPID.pid)
        log.info("killed")
    }
}
const startPythonSubprocess = async (db_path, log_path, isPackaged) => {
    await killProcessesOnPort(LOCAL_BACKEND_PORT)
    const script = isPackaged
        ? path.join(process.resourcesPath, `./pythonBackend/app`)
        : `./pythonBackend/app`;
    const args = ["--dbpath", db_path, "--logpath", log_path]
    log.log("starting python subprocess, full command=" + script + " " + args.join(" "));
    const child = require("child_process").execFile(script, ["--dbpath", db_path, "--logpath", log_path]);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", function (data) {
        log.log(data + "\r");
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", function (data) {
        log.log(data + "\r");
    });

    return child;
};

const pollUntilPythonServerIsUp = async () => {
    if (START_PYTHON_SERVER_OVERRIDE || app.isPackaged) {
        const tries = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2];
        for (const seconds of tries) {
            log.log(
                "trying to connect to python server, waiting for " + seconds + " seconds"
            );
            await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
            if (await isPythonServerUp()) {
                log.log("python server is up");
                return;
            }
        }
        throw Error("Python server is not up...")
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

module.exports = {startPythonServer, pollUntilPythonServerIsUp, isPythonServerUp, killPythonServer};
// startPythonSubprocess();
