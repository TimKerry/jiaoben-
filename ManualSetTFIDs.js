/**
 * ManualSetTFIDs.js
 * 作用：把模块参数 ManualAppIDs 写入持久化键 TF_APP_ID（AutoJoinTF.js 会检查这个键）
 * 用法：在 module 的脚本条目里通过 argument={{{ManualAppIDs}}} 传入
 */
(() => {
  try {
    const arg = (typeof $argument === 'string' ? $argument : '').trim();
    if (!arg) {
      console.log('[ManualSetTFIDs] 未收到参数（ManualAppIDs 为空），不写入。');
      $done();
      return;
    }
    const ids = arg.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      console.log('[ManualSetTFIDs] 解析后为空，不写入。');
      $done();
      return;
    }
    const csv = ids.join(',');

    if (typeof $persistentStore !== 'undefined' && $persistentStore.write) {
      $persistentStore.write(csv, 'TF_APP_ID');
      console.log(`[ManualSetTFIDs] 已写入 TF_APP_ID => ${csv}`);
      $done();
      return;
    }
    if (typeof $prefs !== 'undefined' && $prefs.set) {
      $prefs.set(csv, 'TF_APP_ID');
      console.log(`[ManualSetTFIDs] (prefs) 已写入 TF_APP_ID => ${csv}`);
      $done();
      return;
    }

    console.log('[ManualSetTFIDs] 未找到持久化 API，写入失败。');
    $done();
  } catch (e) {
    console.log('[ManualSetTFIDs] 错误：' + e);
    $done();
  }
})();
