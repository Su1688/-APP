/**
 * 云开发配置
 *
 * 怎么填：
 * 1. 用微信开发者工具打开本项目（需要自己的 AppID，不能用游客模式）
 * 2. 点顶部「云开发」按钮，开通并创建环境
 * 3. 把环境 ID 填到下面的 ENV 里，例如 "diancai-8g1a2b3c4d5e6f7"
 * 4. 右键 cloudfunctions/kitchen 目录 → 上传并部署（云端安装依赖）
 *
 * ENV 留空时 = 单机模式，一切走本地 Storage，功能和现在完全一样。
 */
module.exports = {
  ENV: "cloud1-d3g2jgvk22b11d8ad",
  // 云函数名（要和 cloudfunctions 下的目录名一致）
  FUNCTION_NAME: "kitchen"
};
