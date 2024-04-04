const {fetchPostFn} = require("../utils/requests");
const log = require("electron-log");

const keyboardListener = (freezeDuration = 3 * 1000, uploadIntervalSeconds = 10 * 1000) => {
    let clickTimestamps = [];
    let server = null;

    const addClick = () => {
        const t = new Date();
        if ((clickTimestamps.length > 0) && ((t - clickTimestamps[clickTimestamps.length - 1]) < freezeDuration)) {
            return
        }
        clickTimestamps.push(t)
    }

    const uploadToServer = () => {
        if (clickTimestamps.length === 0) return

        log.info("Uploading keyboard activity...")
        fetchPostFn(
            "/keyboard/append",
            {timestamps: clickTimestamps}
        )
        clickTimestamps = []
    }
    return {
        start: () => {
            setInterval(uploadToServer, uploadIntervalSeconds)
            server = new GlobalKeyboardListener();
            server.addListener(addClick);
        },
        stop: () => {
            if (server === null) return
            server.kill()
        }
    }
}

module.exports = {keyboardListener: keyboardListener()}