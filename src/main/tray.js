const {fetchGetFn} = require("../utils/requests");
const log = require("electron-log");
const {checkIfShouldCreateWorkSessionAndNotify, notifier, notifyWorkSessionComplete} = require("./notif");

let ongoing = false;

const updateTrayIconDuration = async (app, tray) => {
    const minutesLeft = await getCurrentWorkSessionTime();
    log.debug(`got ${minutesLeft} minutes left in the current work session`);
    if (minutesLeft === null) {
        tray.setTitle("");
        if (app.isPackaged) {
            notifier.checkAndNotify();
        }
    } else {
        tray.setTitle(Math.ceil(minutesLeft).toString());
    }

    if (ongoing && minutesLeft === null) {
        log.info("work session complete, sending notification")
        notifyWorkSessionComplete();
    }
    ongoing = (minutesLeft !== null);
};

const getCurrentWorkSessionTime = async () => {
    const currentWorkSession = await fetchGetFn("/work_session/current");
    if (currentWorkSession?.id === undefined) {
        return null;
    }
    const minutesLeft =
        (new Date(currentWorkSession.end_time) - new Date()) / 1000 / 60;
    return minutesLeft;
};

module.exports = {updateTrayIconDuration};
