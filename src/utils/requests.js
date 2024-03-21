const log = require("electron-log");
const {LOCAL_BACKEND_URL} = require("../main/settings");

const fetchGetFn = async (path, data = {}) => {
    const url = `${LOCAL_BACKEND_URL}${path}?` + new URLSearchParams(data);

    try {
        const resp = await fetch(
            url,
            {
                method: "GET",
            }
        );
        return await resp.json()
    } catch (e) {

        log.error(url, e)
        debugger;
        throw e
    }
};

const fetchPostFn = async (path, data) => {
    const resp = await fetch(`${LOCAL_BACKEND_URL}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });
    return await resp.json()
};

module.exports = {fetchGetFn, fetchPostFn};
