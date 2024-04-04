const {fetchGetFn} = require("../utils/requests");
const log = require("electron-log");
const {checkIfShouldCreateWorkSessionAndNotify, notifier, notifyWorkSessionComplete} = require("./notif");
const {app, Tray, Menu, shell} = require("electron");
const path = require("node:path");
const {REMOTE_BACKEND_URL, LANDING_PAGE_URL} = require("./settings");
const {getUserSettings} = require("./user_settings");

let ongoing = false;

const prettyPlanName = {
    FREE: "Free",
    PRO: "Pro",
    PROCLARITY: "ProClarity"
}

function getPlanUpdate(subscriptionId) {
    return subscriptionId ? {
        label: `Update Subscription`,
        click: () => {
            const url = `${REMOTE_BACKEND_URL}/stripe/update_subscription?subscription_id=${subscriptionId}`
            shell.openExternal(url)
        }
    } : {
        label: `Upgrade Now`,
        click: () => {
            const url = `${LANDING_PAGE_URL}/#pricing`
            shell.openExternal(url)
        }
    };
}


const getCurrentWorkSessionTime = async () => {
    const currentWorkSession = await fetchGetFn("/work_session/current");
    if (currentWorkSession?.id === undefined) {
        return null;
    }
    const minutesLeft =
        (new Date(currentWorkSession.end_time) - new Date()) / 1000 / 60;
    return minutesLeft;
};

const tray = () => {
    let tray = null;

    const initTray = () => {
        const assetsPath = app.isPackaged
            ? path.join(process.resourcesPath, "assets")
            : "assets";

        tray = new Tray(`${assetsPath}/tray_icon.png`);
    }

    const updateTrayIconDuration = async () => {
        if (tray === null) initTray()
        const minutesLeft = await getCurrentWorkSessionTime();
        log.info(`got ${minutesLeft} minutes left in the current work session`);
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
    }

    let interval = null;
    return {
        startCheckingWorkSessionMinutesLeft: (freq) => {
            interval = setInterval(updateTrayIconDuration, freq)
        },
        buildTrayMenu: () => {
            if (tray === null) initTray();
            const plan = prettyPlanName[getUserSettings().plan]
            const contextMenu = Menu.buildFromTemplate([
                getPlanUpdate(getUserSettings().subscription_id),
                {
                    label: `JoystickAI ${plan} | Version: ${app.getVersion()}`,
                    enabled: false,
                },
            ]);
            tray.setContextMenu(contextMenu);
        },
        endCheckingWorkSessionMinutesLeft: () => clearInterval(interval)
    }
}
const {startCheckingWorkSessionMinutesLeft, buildTrayMenu, endCheckingWorkSessionMinutesLeft} = tray()
module.exports = {startCheckingWorkSessionMinutesLeft, buildTrayMenu, endCheckingWorkSessionMinutesLeft};
