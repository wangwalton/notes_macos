const { fetchGetFn } = require("./utils/requests");

const updateTrayIconDuration = async (tray) => {
  const minutesLeft = await getCurrentWorkSessionTime();
  if (minutesLeft === null) {
    tray.setTitle("");
  } else {
    tray.setTitle(Math.ceil(minutesLeft).toString());
  }
};

const getCurrentWorkSessionTime = async () => {
  const currentWorkSession = await fetchGetFn("/work_session/current");
  if (currentWorkSession?.id === undefined) {
    return null;
  }
  const minutesLeft =
    (new Date(currentWorkSession.end_time) - new Date()) / 1000 / 60;
  return minutesLeft;
};

module.exports = { updateTrayIconDuration };
