const STATUS = {
  pending: {
    key: "pending",
    text: "待接单",
    color: "#e08a1e",
    soft: "#fff3e0",
    desc: "已经把菜单送到大厨手里啦",
    step: "已提交点菜"
  },
  cooking: {
    key: "cooking",
    text: "制作中",
    color: "#ff6b4a",
    soft: "#ffe9e2",
    desc: "大厨正在灶台前忙活，香味快出来了",
    step: "大厨接单，正在做"
  },
  done: {
    key: "done",
    text: "已完成",
    color: "#12a594",
    soft: "#e2f7f4",
    desc: "开饭啦，趁热吃～",
    step: "做好啦"
  },
  cancel: {
    key: "cancel",
    text: "已取消",
    color: "#9a8f8a",
    soft: "#f2edeb",
    desc: "这单已经取消啦",
    step: "已取消"
  }
};

const FLOW = ["pending", "cooking", "done"];

const ACTION_TEXT = {
  pending: "接单开做",
  cooking: "做好啦"
};

function getStatus(key) {
  return STATUS[key] || STATUS.pending;
}

function nextStatus(key) {
  const index = FLOW.indexOf(key);
  if (index < 0 || index >= FLOW.length - 1) {
    return "";
  }
  return FLOW[index + 1];
}

function getActionText(key) {
  return ACTION_TEXT[key] || "";
}

module.exports = {
  STATUS: STATUS,
  FLOW: FLOW,
  getStatus: getStatus,
  nextStatus: nextStatus,
  getActionText: getActionText
};
