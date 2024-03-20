let REMOTE_FRONTEND_URL = "https://notes.joystickai.com";
let LOCAL_FRONTEND_URL = "http://localhost:5173"
// using 127.0.0.1 for backend because node 18 onwards doesn't allow localhost
let BACKEND_URL = "http://127.0.0.1:41852"


// When running yarn start, we will use the local port, not the packaged port
if (process.env.USE_DEV_URLS === "true") {
    BACKEND_URL = "http://127.0.0.1:19989"
}

const START_PYTHON_SERVER_OVERRIDE = true;
const START_LOCAL_HTML_OVERRIDE = true;

module.exports = {
    BACKEND_URL,
    REMOTE_FRONTEND_URL,
    LOCAL_FRONTEND_URL,
    START_PYTHON_SERVER_OVERRIDE,
    START_LOCAL_HTML_OVERRIDE
};


