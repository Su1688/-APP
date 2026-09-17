function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    if (value === "" || value === null || value === undefined) {
      return fallback;
    }
    return value;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    wx.showToast({ title: "保存失败，存储空间可能已满", icon: "none" });
    return false;
  }
}

function readArray(key) {
  const value = read(key, []);
  return Array.isArray(value) ? value : [];
}

function readObject(key) {
  const value = read(key, {});
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

module.exports = {
  read: read,
  write: write,
  readArray: readArray,
  readObject: readObject
};
