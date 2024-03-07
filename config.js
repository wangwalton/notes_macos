const Store = require("electron-store");
const store = new Store();
const log = require("electron-log");

const getEnvVar = (key, defaultValue) => {
  if (process.env[key] === undefined) {
    return defaultValue;
  }
  return process.env[key];
};

const getBoolEnvVar = (key, defaultValue) => {
  if (process.env[key] === undefined) {
    return defaultValue;
  }
  return process.env[key] === "true";
};

const config = {
  IS_CLOUD: store.get("IS_CLOUD", false),
  USE_BUNDLED_BACKEND: getBoolEnvVar("USE_BUNDLED_BACKEND", true),
  USE_BUNDLED_FRONTEND: getBoolEnvVar("USE_BUNDLED_FRONTEND", false),
};

log.info("config: ", config);
module.exports = config;
