const {fetchGetFn} = require("./requests");
const log = require("electron-log");

const startPythonTrigger = (freq = 10 * 60 * 1000) => {
    setInterval(async () => {
        log.info("triggering python jobs...")
        const res = await fetchGetFn("/poll/trigger")

    }, freq)
}


module.exports = {startPythonTrigger}