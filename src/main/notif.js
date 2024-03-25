const {fetchPostFn, fetchGetFn} = require("../utils/requests");
const {userSettings: {getUserSettings}} = require("./user_settings")
const {Notification} = require("electron");
const {trackScreenTime} = require("../utils/screen_time");
const log = require("electron-log");

const getWorkingApps = () => {
    return getUserSettings()?.notif_settings.applications_for_create_ws
}

const createWorkSession = async (app_name, duration) => {
    const resp = await fetchPostFn("/work_session/create", {start_time: new Date()})
}


const notify = (app_name) => {
    const notif = new Notification({
        title: "Start a work session?",
        body: `Noticed you had ${app_name} open.`,
    })
    notif.on('click', (event, arg) => {
        createWorkSession()
    });

    notif.show()
}

const wrapper = (notificationCooloff = 3 * 60 * 1000) => {
    // init to some time before
    let lastNotified = new Date() - 1000 * 60 * 60 * 24;
    const checkAndNotify = () => {

        const screenTime = trackScreenTime.getLastAvailable()
        const appName = screenTime.app_name;
        log.info("No active work sessions and found appName=", appName, "getWorkingApps=", getWorkingApps())
        if (getWorkingApps().includes(appName)) {
            if (new Date() - lastNotified > notificationCooloff) {
                log.info("user might be working, notifiying...")
                notify(appName);
                lastNotified = new Date();
            }
        }
    }

    return {
        checkAndNotify
    };
}

const notifyWorkSessionComplete = () => {
    const notif = new Notification({
        title: "Work session complete",
        body: `You've completed a work session!`
    })
    notif.show()
}

module.exports = {notifier: wrapper(), notify, notifyWorkSessionComplete}