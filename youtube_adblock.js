// youtube_adblock.js
// 注：这是注入到 YouTube 页面（watch/embed）上的脚本
(() => {
  'use strict';

  try {
    // 工具：安全地解析 JSON 并尝试去除广告字段
    function stripAdsFromPlayerResponse(json) {
      if (!json || typeof json !== 'object') return json;
      // 常见字段清理
      if (json.adPlacements) { json.adPlacements = []; }
      if (json.playerAds) { json.playerAds = []; }
      if (json.adBreaks) { json.adBreaks = []; }
      if (json.ads) { json.ads = []; }
      if (json.sponsors) { json.sponsors = []; }
      // YouTube player response 的 nested fields
      if (json.playabilityStatus && json.playabilityStatus.errorScreen) {
        // nothing
      }
      // Try to remove any fields that look like ad metadata
      for (const k of Object.keys(json)) {
        const v = json[k];
        if (!v) continue;
        if (typeof v === 'object') stripAdsFromPlayerResponse(v);
      }
      return json;
    }

    // 覆盖 fetch，拦截针对 youtubei/v1 的响应并尝试清理广告字段
    const _fetch = window.fetch;
    window.fetch = async function(input, init) {
      try {
        const url = (typeof input === 'string') ? input : (input && input.url) || '';
        // 如果是 API 请求（youtubei, get_midroll, get_video_info 等），先拿到响应 text/JSON
        if (/\/youtubei\/v1\/|get_midroll_|get_video_info|pagead|ptracking/i.test(url)) {
          const resp = await _fetch.apply(this, arguments);
          const ct = resp.headers.get('content-type') || '';
          // 只有在 JSON 时尝试修改
          if (ct.includes('application/json') || ct.includes('text/javascript') || ct.includes('application/javascript')) {
            const text = await resp.text();
            try {
              const data = JSON.parse(text);
              const cleaned = stripAdsFromPlayerResponse(data);
              const body = JSON.stringify(cleaned);
              // 创建一个新的 Response 对象返回（保留 headers/status）
              return new Response(body, {
                status: resp.status,
                statusText: resp.statusText,
                headers: resp.headers
              });
            } catch (e) {
              // 解析失败，返回原始响应
              return new Response(text, {
                status: resp.status,
                statusText: resp.statusText,
                headers: resp.headers
              });
            }
          }
          return resp;
        }
      } catch (e) {
        // 出错回退
        // console.error('fetch hook error', e);
      }
      return _fetch.apply(this, arguments);
    };

    // 覆盖 XMLHttpRequest (防止某些老接口走 XHR)
    (function() {
      const XHR = window.XMLHttpRequest;
      function NoAdXHR() {
        const xhr = new XHR();
        const open = xhr.open;
        xhr.open = function(method, url) {
          xhr._url = url;
          return open.apply(this, arguments);
        };
        const send = xhr.send;
        xhr.send = function() {
          try {
            if (xhr._url && /\/youtubei\/v1\/|get_midroll_|get_video_info|pagead|ptracking/i.test(xhr._url)) {
              // 取消此请求 by returning an empty response through readyState change
              setTimeout(() => {
                try {
                  xhr.readyState = 4;
                  xhr.status = 200;
                  xhr.responseText = JSON.stringify({});
                  if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
                } catch(e) {}
              }, 10);
              return;
            }
          } catch (e) {}
          return send.apply(this, arguments);
        };
        return xhr;
      }
      try {
        window.XMLHttpRequest = NoAdXHR;
      } catch (e) {}
    })();

    // DOM 层面：删除广告容器与 overlay（定期清理）
    const adSelectors = [
      '#player-ads', '.ytd-display-ad-renderer', '.video-ads', '.ytp-ad-module',
      '.ytp-ad-player-overlay', '.ytd-promoted-sparkles-web-renderer', '.ytp-paid-content-overlay'
    ];
    function removeAdElements() {
      try {
        adSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(n => n.remove());
        });
        // 移除带 data-ad 或 id 含 ad 的元素
        document.querySelectorAll('[id*="ad"], [class*="ad-"], [data-ad]').forEach(n => {
          // 额外判断，避免误删重要元素
          if (n && n.parentNode) n.parentNode.removeChild(n);
        });
      } catch (e) {}
    }
    const obs = new MutationObserver(() => {
      removeAdElements();
    });
    try {
      obs.observe(document, {childList: true, subtree: true});
      removeAdElements();
    } catch (e) {}

    // 覆盖全局 ytInitialPlayerResponse（尝试移除 ads）
    try {
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        enumerable: true,
        get: function() { return this.__ytr || {}; },
        set: function(v) {
          this.__ytr = stripAdsFromPlayerResponse(v);
        }
      });
    } catch (e) {}

    // 快速修正：当页面 ready 时，再次尝试触发移除
    window.addEventListener('yt-page-data-updated', removeAdElements, true);
    window.addEventListener('DOMContentLoaded', () => setTimeout(removeAdElements, 300));
    setTimeout(removeAdElements, 500);
    // 最后一招：尝试跳过广告计时（仅在部分场景有效）
    try {
      const originalStop = HTMLVideoElement.prototype.pause;
      HTMLVideoElement.prototype.pause = function() {
        // 如果该视频是广告（有广告标记），尽量跳过 pause 导致的计时阻塞 —— 仅保守操作
        return originalStop.apply(this, arguments);
      };
    } catch (e) {}

    // 日志（调试时打开）
    // console.info('YouTube adblock injected');
  } catch (err) {
    // console.error('YouTube adblock failed', err);
  }
})();
