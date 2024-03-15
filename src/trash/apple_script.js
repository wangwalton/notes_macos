const return_delimeter = "|||";

const applescript = require("applescript");
module.exports = async function getActiveApp() {
  const script = `
tell application "System Events"
    set appProc to first application process whose frontmost is true
    
    set app_name to bundle identifier of appProc
    set window_title to name of front window of appProc

    return app_name & "${return_delimeter}" & window_title
end tell
    `;

  return new Promise((resolve, reject) => {
    applescript.execString(script, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const res = result.split(return_delimeter);
        resolve({
          app_name: res[0],
          window_title: res[1],
          time: new Date().toISOString(),
        });
      }
    });
  });
};
