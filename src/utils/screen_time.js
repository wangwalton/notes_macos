const log = require("electron-log");
const activeWindow = require("active-win");
const {LOCAL_BACKEND_URL} = require("../main/settings");

const trackScreenTime = (
    pollIntervalSeconds = 2 * 1000,
    uploadIntervalSeconds = 10 * 1000
) => {
    log.info("starting screen time tracking");
    let currentData = [];
    let lastAvailable = null;

    const pollAppItems = async () => {
        const appInfo = await activeWindow({
            screenRecordingPermission: true,
        });
        if ((!appInfo) || !("owner" in appInfo)) {
            log.info("no owner in appInfo, appInfo", appInfo);
            return;
        }

        const newItem = {
            app_name: appInfo.owner.name,
            window_title: appInfo.title,
            url: appInfo.url,
            time: new Date().toISOString(),
        };
        lastAvailable = newItem;
        const last = currentData[currentData.length - 1];

        if (
            last &&
            last.app_name === newItem.app_name &&
            last.window_title === newItem.window_title &&
            last.url === newItem.url
        ) {
            return;
        }

        currentData.push(newItem);
    };

    const uploadScreenTime = () => {
        const url = `${LOCAL_BACKEND_URL}/screen_time/bulk_create`;
        log.info("uploading screen time... url=" + url);
        const data = currentData;
        currentData = [];

        if (data.length === 0) {
            log.debug("no data to upload, skipping...");
            return;
        }

        fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({app_items: data}),
        })
            .then((res) => res.text())
            .catch((error) => {
                log.info(error);
            })
            .then((text) => {
                log.info("bulk create response", text);
            })
            .catch((error) => {
                log.info(error);
            });
        log.debug("uploading screen time... done");
    };


    return {
        start: () => {
            setInterval(pollAppItems, pollIntervalSeconds);
            setInterval(uploadScreenTime, uploadIntervalSeconds);
        },
        getLastAvailable: () => lastAvailable,

    }
};

module.exports = {trackScreenTime: trackScreenTime()}

