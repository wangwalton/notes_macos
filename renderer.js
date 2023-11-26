const settings = window.electronAPI.settings;
const setButton = document.getElementById("btn");

setButton.addEventListener("click", () => {
  fetch(`${settings.BACKEND_URL}/work_session/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  })
    .then((res) => res.text())
    .then((text) => {
      const p = document.getElementById("text");
      p.innerHTML = text;
    });
});
