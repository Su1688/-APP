/**
 * 菜品图片：选图 → 压缩 → 落地
 *
 * 为什么不能直接用 wx.chooseMedia 给的路径：
 * 那是临时文件（wxfile://tmp_*），小程序一重启就没了，存进菜品数据等于丢图。
 * 所以要落成下面两种之一：
 * - 云开发可用：上传云存储，拿到 cloud:// 的 fileID，她那台手机也能看到
 * - 云开发不可用：存进本地用户目录（wxfile://usr/），只能自己手机上看
 */
const cloud = require("./cloud.js");

const QUALITY = 80;

// 复用 utils/cloud.js 的判断并顺手 init，避免「配置了但没初始化」导致上传失败
function cloudReady() {
  return cloud.init();
}

function isRemote(value) {
  return typeof value === "string" && value.indexOf("cloud://") === 0;
}

function isLocalFile(value) {
  return typeof value === "string" && value.indexOf("wxfile://") === 0;
}

// 打包进小程序包里的图（以 / 开头），删不掉，也不该删
function isBundled(value) {
  return typeof value === "string" && value.charAt(0) === "/";
}

function localDir() {
  if (typeof wx === "undefined" || !wx.env || !wx.env.USER_DATA_PATH) {
    return "";
  }
  return wx.env.USER_DATA_PATH;
}

function choose() {
  return new Promise(function (resolve, reject) {
    if (typeof wx === "undefined" || typeof wx.chooseMedia !== "function") {
      reject({ code: "UNSUPPORTED", message: "当前微信版本不支持选图" });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      camera: "back",
      success(res) {
        const file = res && res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          reject({ code: "CANCELLED" });
          return;
        }
        resolve(file.tempFilePath);
      },
      fail(err) {
        reject(err || { code: "CANCELLED" });
      }
    });
  });
}

function compress(src) {
  return new Promise(function (resolve) {
    if (typeof wx.compressImage !== "function") {
      resolve(src);
      return;
    }
    wx.compressImage({
      src: src,
      quality: QUALITY,
      success(res) {
        resolve((res && res.tempFilePath) || src);
      },
      fail() {
        resolve(src);
      }
    });
  });
}

function upload(filePath) {
  return new Promise(function (resolve, reject) {
    const cloudPath = "dishes/" + Date.now() + "-" + Math.floor(Math.random() * 1000000) + ".jpg";
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success(res) {
        if (res && res.fileID) {
          resolve(res.fileID);
        } else {
          reject({ code: "UPLOAD_FAILED", message: "上传失败" });
        }
      },
      fail(err) {
        reject(err || { code: "UPLOAD_FAILED", message: "上传失败" });
      }
    });
  });
}

function saveLocal(tempPath) {
  return new Promise(function (resolve, reject) {
    const dir = localDir();
    if (!dir) {
      reject({ code: "SAVE_FAILED", message: "本地目录不可用" });
      return;
    }
    const dest = dir + "/dish_" + Date.now() + ".jpg";
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      filePath: dest,
      success(res) {
        resolve((res && res.savedFilePath) || dest);
      },
      fail(err) {
        reject(err || { code: "SAVE_FAILED", message: "保存失败" });
      }
    });
  });
}

// 把选来的临时图，变成可以存进菜品数据的地址
function persist(tempPath) {
  if (!tempPath) {
    return Promise.reject({ code: "EMPTY" });
  }
  return compress(tempPath).then(function (path) {
    if (cloudReady()) {
      return upload(path);
    }
    return saveLocal(path);
  });
}

function remove(value) {
  if (!value) {
    return Promise.resolve(false);
  }
  if (isRemote(value)) {
    return new Promise(function (resolve) {
      if (!cloudReady() || typeof wx.cloud.deleteFile !== "function") {
        resolve(false);
        return;
      }
      wx.cloud.deleteFile({
        fileList: [value],
        complete() {
          resolve(true);
        }
      });
    });
  }
  if (isLocalFile(value)) {
    return new Promise(function (resolve) {
      wx.getFileSystemManager().unlink({
        filePath: value,
        complete() {
          resolve(true);
        }
      });
    });
  }
  return Promise.resolve(false);
}

module.exports = {
  cloudReady: cloudReady,
  choose: choose,
  persist: persist,
  remove: remove,
  isRemote: isRemote,
  isLocalFile: isLocalFile,
  isBundled: isBundled
};
