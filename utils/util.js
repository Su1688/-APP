function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatTime(ts) {
  const d = new Date(ts);
  return (
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function formatFullTime(ts) {
  const d = new Date(ts);
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) {
    return "刚刚";
  }
  if (diff < 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 1000)) + " 分钟前";
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 60 * 1000)) + " 小时前";
  }
  return formatTime(ts);
}

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeOrderNo(ts) {
  const d = new Date(ts);
  const serial = Math.floor(Math.random() * 9000 + 1000);
  return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + serial;
}

function greetByHour(hour) {
  if (hour < 5) {
    return "这么晚还没睡呀";
  }
  if (hour < 11) {
    return "早上好呀";
  }
  if (hour < 14) {
    return "中午好呀";
  }
  if (hour < 18) {
    return "下午好呀";
  }
  return "晚上好呀";
}

module.exports = {
  pad: pad,
  formatTime: formatTime,
  formatFullTime: formatFullTime,
  relativeTime: relativeTime,
  uid: uid,
  makeOrderNo: makeOrderNo,
  greetByHour: greetByHour
};
