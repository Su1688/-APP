const config = require("../config/cloud.js");

let inited = false;

function isConfigured() {
  return !!(config.ENV && config.ENV.length > 0);
}

function isSupported() {
  return typeof wx !== "undefined" && !!wx.cloud;
}

function init() {
  if (inited) {
    return true;
  }
  if (!isConfigured() || !isSupported()) {
    return false;
  }
  try {
    wx.cloud.init({ env: config.ENV, traceUser: true });
    inited = true;
    return true;
  } catch (e) {
    return false;
  }
}

function call(action, data) {
  if (!init()) {
    return Promise.reject({ code: "CLOUD_DISABLED", message: "云开发没有配置" });
  }
  const payload = Object.assign({ action: action }, data || {});
  return wx.cloud
    .callFunction({ name: config.FUNCTION_NAME, data: payload })
    .then(function (res) {
      const result = res && res.result;
      if (!result || result.ok !== true) {
        return Promise.reject({
          code: (result && result.error) || "CLOUD_ERROR",
          message: (result && result.message) || "云函数返回异常"
        });
      }
      return result;
    });
}

module.exports = {
  isConfigured: isConfigured,
  isSupported: isSupported,
  init: init,
  call: call
};
