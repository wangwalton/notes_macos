const { IS_CLOUD } = require("./config");
const getHeaders = (token) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (IS_CLOUD) {
    headers["Cookie"] = `notlaw_user_jwt=${token}`;
  }
  return headers;
};

module.exports = {
  getHeaders,
};
