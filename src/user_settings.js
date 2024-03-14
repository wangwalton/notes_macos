const log = require("electron-log");

const IS_CLOUD = "IS_CLOUD";
const USE_BUNDLED_BACKEND = "USE_BUNDLED_BACKEND";
const USE_BUNDLED_FRONTEND = "USE_BUNDLED_FRONTEND";

const fetchInterval = 30 * 1000;
const getUserSettingsWrapper = () => {
  let userSettings = _getUserSettings();

  setInterval(() => {
    userSettings = _getUserSettings();
  }, fetchInterval);

  return [
    (name) => userSettings[name],
    () => {
      userSettings = _getUserSettings();
    },
  ];
};

const _getUserSettings = async () => {
  log.debug("fetching latest user settings...");
  const res = await fetch("http://127.0.0.1:5000/user_setting/get", {
    method: "GET",
  });
  if (!res.ok) {
    log.info("error fetching user settings", res);
  } else {
    const jsonRes = await res.json();

    log.transports.file.level = jsonRes.log_level;
    log.transports.console.level = jsonRes.log_level;

    log.info("fetched user settings", jsonRes);
    return jsonRes;
  }
};

const [getUserSetting, refreshUserSettings] = getUserSettingsWrapper();

module.exports = {
  getUserSetting,
  refreshUserSettings,
  constants: {
    IS_CLOUD,
    USE_BUNDLED_BACKEND,
    USE_BUNDLED_FRONTEND,
  },
};
