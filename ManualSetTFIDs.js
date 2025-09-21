// ManualSetTFIDs.js
// 用法：在模块 [Argument] 的 TF_APP_ID 中填写，或运行时传参；会写入持久化键 "TF_APP_ID"
(() => {
  const arg = typeof $argument === "string" ? $argument : "";
  // 兼容两种传参格式：字符串 "TF_APP_ID=xxx" 或对象 {TF_APP_ID: "xxx"}
  let ids = "";
  try {
    if (arg.includes("=")) {
      // "a=1&b=2" 形式
      const map = Object.fromEntries(arg.split("&").map(kv => kv.split("=")));
      ids = decodeURIComponent(map.TF_APP_ID || "");
    } else if (typeof $argument === "object" && $argument) {
      ids = ($argument.TF_APP_ID || $argument.tf_app_id || "");
    }
  } catch (e) {}

  ids = (ids || "").replace(/\s+/g, "").replace(/，/g, ","); // 去空格，兼容中文逗号

  if (!ids) {
    $notification.post("ManualSetTFIDs", "未提供 TF_APP_ID", "请在模块参数或运行时传参填写");
    return $done({ result: "No TF_APP_ID" });
  }

  const ok = $persistentStore.write(ids, "TF_APP_ID");
  if (ok) {
    $notification.post("ManualSetTFIDs", "已写入 TF_APP_ID =>", ids);
    return $done({ result: "OK", value: ids });
  } else {
    $notification.post("ManualSetTFIDs", "写入失败", ids);
    return $done({ result: "Write failed" });
  }
})();
