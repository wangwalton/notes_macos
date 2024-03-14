const fetchErrorHandling = (resp) => {
  resp
    .then((res) => res.json())
    .catch((error) => {
      log.info(error);
    });
};

const fetchGetFn = async (path, data = {}) => {
  const resp = fetch(
    `http://127.0.0.1:5000${path}?` + +new URLSearchParams(data),
    {
      method: "GET",
    }
  );
  return fetchErrorHandling(resp);
};

const fetchPostFn = async (path, data) => {
  const resp = fetch(`http://127.0.0.1:5000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return fetchErrorHandling(resp);
};

module.exports = { fetchGetFn, fetchPostFn };
