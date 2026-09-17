const store = require("./utils/store.js");
const sync = require("./utils/sync.js");

App({
  globalData: {
    role: "girl"
  },

  onLaunch() {
    this.globalData.role = store.getRole();
    sync.init();
    sync.refreshPair();
  }
});
