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

/**
 * 渲染：把 cloud:// 的 fileID 换成 https 临时链接
 *
 * 为什么还要这一步：
 * <image> 虽然支持直接写 fileID，但个别环境（开发者工具、老版本基础库）解析不出来，
 * 结果就是一块灰底。渲染前统一换成 https 链接更稳，另外做个内存缓存，
 * 免得每次刷新都去换一遍。
 */
const URL_TTL = 3600 * 1000;
const urlCache = {};

function cacheGet(fileID) {
  const hit = urlCache[fileID];
  if (!hit) {
    return "";
  }
  if (hit.expireAt <= Date.now()) {
    delete urlCache[fileID];
    return "";
  }
  return hit.url;
}

function cacheSet(fileID, url, maxAge) {
  // 云函数签发的链接不告诉我们 maxAge，保守按 30 分钟缓存
  const seconds = Number(maxAge) > 0 ? Number(maxAge) : 1800;
  // 留 5 分钟余量，避免链接刚上屏就过期
  const ttl = Math.max(60, seconds - 300) * 1000;
  urlCache[fileID] = {
    url: url,
    expireAt: Date.now() + Math.min(ttl, URL_TTL)
  };
}

function uniqueFileIds(list) {
  const seen = {};
  const out = [];
  list.forEach(function (value) {
    if (isRemote(value) && !seen[value]) {
      seen[value] = true;
      out.push(value);
    }
  });
  return out;
}

// 本地换链接：云存储是「仅创建者可读写」时通常会被拒，只当兜底
function localUrls(fileIDs) {
  return new Promise(function (resolve) {
    if (typeof wx.cloud.getTempFileURL !== "function") {
      resolve({});
      return;
    }
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success(res) {
        const map = {};
        ((res && res.fileList) || []).forEach(function (item) {
          if (item && item.status === 0 && item.tempFileURL) {
            map[item.fileID] = item.tempFileURL;
          }
        });
        resolve(map);
      },
      fail() {
        resolve({});
      }
    });
  });
}

// 换不到就返回空表，调用方原样用旧值，不阻断渲染
function loadUrls(fileIDs) {
  return new Promise(function (resolve) {
    if (!fileIDs.length || !cloudReady()) {
      resolve({});
      return;
    }
    // 先走云函数：管理员身份签发的链接带签名，绕开「仅创建者可读写」
    cloud
      .call("imageUrls", { fileIds: fileIDs })
      .then(function (res) {
        const urls = (res && res.urls) || {};
        if (Object.keys(urls).length > 0) {
          return urls;
        }
        return localUrls(fileIDs);
      })
      .catch(function () {
        // 云函数还没部署 / 环境不可用，退回本地换链接
        return localUrls(fileIDs);
      })
      .then(function (map) {
        Object.keys(map).forEach(function (fileID) {
          cacheSet(fileID, map[fileID]);
        });
        resolve(map);
      });
  });
}

// 单个地址：云图换 https，打包图 / 本地图原样返回
function resolve(value) {
  if (!isRemote(value)) {
    return Promise.resolve(value);
  }
  const cached = cacheGet(value);
  if (cached) {
    return Promise.resolve(cached);
  }
  return loadUrls([value]).then(function (map) {
    return map[value] || value;
  });
}

// 列表：挨个换 image；没有需要换的就返回原数组（调用方靠 === 判断要不要 setData）
function resolveList(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return Promise.resolve(list);
  }
  const pending = [];
  list.forEach(function (item) {
    const value = item && item.image;
    if (isRemote(value) && !cacheGet(value)) {
      pending.push(value);
    }
  });
  const ready = pending.length ? loadUrls(uniqueFileIds(pending)) : Promise.resolve({});
  return ready.then(function (map) {
    let changed = false;
    const out = list.map(function (item) {
      const value = item && item.image;
      if (!isRemote(value)) {
        return item;
      }
      const url = map[value] || cacheGet(value);
      if (!url || url === value) {
        return item;
      }
      changed = true;
      return Object.assign({}, item, { image: url });
    });
    return changed ? out : list;
  });
}

module.exports = {
  cloudReady: cloudReady,
  choose: choose,
  persist: persist,
  remove: remove,
  isRemote: isRemote,
  isLocalFile: isLocalFile,
  isBundled: isBundled,
  resolve: resolve,
  resolveList: resolveList
};
