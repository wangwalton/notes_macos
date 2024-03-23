const log = require("electron-log");
const {LOCAL_BACKEND_URL} = require("./settings");

const IS_CLOUD = "IS_CLOUD";
const USE_BUNDLED_FRONTEND = "USE_BUNDLED_FRONTEND";

const fetchInterval = 30 * 1000;


const userSettings = () => {
    let userSettings = null;
    const refetchUserSettings = async () => {
        userSettings = await _getUserSettings();
    }
    return {
        initUserSettings: async () => {
            await refetchUserSettings()
            setInterval(async () => {
                userSettings = await _getUserSettings();
            }, fetchInterval);
        },
        getUserSettings: () => userSettings,
        refetchUserSettings,
    }
}


const _getUserSettings = async () => {
    log.debug("fetching latest user settings...");
    const res = await fetch(`${LOCAL_BACKEND_URL}/user_setting/get_all`, {
        method: "GET",
    });
    if (!res.ok) {
        log.info("error fetching user settings", res);
    } else {
        const jsonRes = await res.json();

        log.transports.file.level = jsonRes.log_level;
        log.transports.console.level = jsonRes.log_level;

        log.info("fetched user settings", JSON.stringify(jsonRes));
        return jsonRes;
    }
};

module.exports = {
    userSettings: userSettings(),
    constants: {
        IS_CLOUD,
        USE_BUNDLED_FRONTEND,
    },
};
