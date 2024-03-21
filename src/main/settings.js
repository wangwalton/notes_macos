let REMOTE_FRONTEND_URL = "https://notes.joystickai.com";
let LOCAL_FRONTEND_URL = "http://localhost:5173"
// using 127.0.0.1 for backend because node 18 onwards doesn't allow localhost


let LOCAL_BACKEND_PORT = 41852
let REMOTE_BACKEND_URL = `https://notesapi.joystickai.com`
let FRONTEND_URL = "https://notes.joystickai.com";

if (process.env.ENV == "LOCAL") {
    REMOTE_BACKEND_URL = `http://127.0.0.1:19988`
    LOCAL_BACKEND_PORT = 19989
    FRONTEND_URL = "http://localhost:5173"

}

let LOCAL_BACKEND_URL = `http://127.0.0.1:${LOCAL_BACKEND_PORT}`

const START_PYTHON_SERVER_OVERRIDE = false;
const START_LOCAL_HTML_OVERRIDE = false;
const getEnvVarBool = (name, default_val) => {
    return (process.env[name] || default_val) === "true";
}

const ALLOW_SCREEN_TIME = getEnvVarBool("ALLOW_SCREEN_TIME", "true")
const ALLOW_FILE_SAVE = getEnvVarBool("ALLOW_FILE_SAVE", "true");


module.exports = {
    LOCAL_BACKEND_PORT,
    LOCAL_BACKEND_URL,
    ALLOW_SCREEN_TIME,
    ALLOW_FILE_SAVE,
    REMOTE_BACKEND_URL,
    FRONTEND_URL,
    START_PYTHON_SERVER_OVERRIDE,
    START_LOCAL_HTML_OVERRIDE
};


