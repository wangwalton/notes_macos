const log = require("electron-log");
const {fetchPostFn} = require("../utils/requests");
const {
    app,
} = require("electron");

const {initUserSettings, getUserSettings, refetchUserSettings} = require("./user_settings")
const {buildTrayMenu} = require("./tray");

const checkPlan = async () => {
    const {subscription_id, plan} = getUserSettings()
    if (plan === "FREE") {
        return
    }
    const res = await fetchPostFn("/stripe/get_plan", {subscription_id}, useRemoteBackend = true)
    log.info(`new_plan=${res.plan}, old_plan=${plan}`)
    if (res.plan != plan) {
        updatePlan({plan: res.plan})
    }
}

const updatePlan = async (payload) => {
    await fetchPostFn("/electron_user/delta_update", payload)
    await refetchUserSettings()
    buildTrayMenu()
}

const initPlanChecking = () => {
    let intervalId = null;
    return {
        startCheckingSubscription: (freq) => {
            if (app.isPackaged) {
                checkPlan()
                intervalId = setInterval(checkPlan, freq)
            }
        },
        endCheckingSubscription: () => clearInterval(intervalId)
    }
}


const {startCheckingSubscription, endCheckingSubscription} = initPlanChecking()

module.exports = {updatePlan, startCheckingSubscription, endCheckingSubscription}