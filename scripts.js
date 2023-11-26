const getActiveApp = require("./apple_script");

(async () => {
  // Your async code here
  const result = await getActiveApp();
  console.log(result);
})();
