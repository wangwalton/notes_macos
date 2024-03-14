let BACKEND_URL = "https://notesapi.joystickai.com";
let FRONTEND_URL = "https://notes.joystickai.com";
BACKEND_URL = "http://127.0.0.1:5000";
FRONTEND_URL = "http://localhost:5173";

if (process.env.USE_DEV_URLS === "true") {
  // using 127.0.0.1 for backend because node 18 onwards doesn't allow localhost
  BACKEND_URL = "http://127.0.0.1:5000";
  FRONTEND_URL = "http://localhost:5173";
  console.log("dev_urls");
}

module.exports = { BACKEND_URL, FRONTEND_URL };
