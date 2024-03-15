const log = require("electron-log");

const fetchGetFn = async (path, data = {}) => {
  const resp = await fetch(
    `http://127.0.0.1:5001${path}?` + +new URLSearchParams(data),
    {
      method: "GET",
    }
  );
  return await resp.json()
};

const fetchPostFn = async (path, data) => {
  const resp = await fetch(`http://127.0.0.1:5001${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await resp.json()
};

module.exports = { fetchGetFn, fetchPostFn };
