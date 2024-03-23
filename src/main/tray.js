const {fetchGetFn} = require("../utils/requests");
const log = require("electron-log");
const {checkIfShouldCreateWorkSessionAndNotify, notifier} = require("./notif");

const updateTrayIconDuration = async (tray) => {
    const minutesLeft = await getCurrentWorkSessionTime();
    log.debug(`got ${minutesLeft} minutes left in the current work session`);
    if (minutesLeft === null) {
        tray.setTitle("");
        notifier.checkAndNotify();
    } else {
        tray.setTitle(Math.ceil(minutesLeft).toString());
    }
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
