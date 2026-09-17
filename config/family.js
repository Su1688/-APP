/**
 * 小家的容量：一个家最多几个人（按微信号算，不是设备）
 *
 * ⚠️ 必须和 cloudfunctions/kitchen/index.js 里的 MAX_MEMBERS 保持一致，
 * 否则前端文案和后端拦截会对不上（前端说还能拉人，后端报满员）。
 */
module.exports = {
  MAX_MEMBERS: 4
};
