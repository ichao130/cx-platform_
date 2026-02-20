/* cx-platform SDK v4 (modal/banner/toast + image + secondary link + action chain + templates) */
(function () {
  "use strict";

  var SCRIPT_ATTR = "data-site-id";

  function preloadImage(src, cb) {
    try {
      var img = new Image();
      img.onload = function(){ cb(true, src); };
      img.onerror = function(){ cb(false, src); };
      img.src = src;
    } catch(e) {
      cb(false, src);
    }
  }

  function log() {
    try { console.log.apply(console, arguments); } catch (e) {}
  }

  function getCurrentScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i] && scripts[i].getAttribute && scripts[i].getAttribute(SCRIPT_ATTR)) return scripts[i];
    }
    return null;
  }

  function qs(obj) {
    var parts = [];
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (obj[k] == null) continue;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(obj[k])));
    }
    return parts.join("&");
  }

  // ------------------ LOGGING (beta) ------------------
  function getOrCreateId(key) {
    try {
      var v = localStorage.getItem(key);
      if (v) return v;
      v = "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();
      localStorage.setItem(key, v);
      return v;
    } catch (e) {
      return "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    }
  }

  function logEndpointFromServe(apiBase) {
    if (!apiBase) return "";
    // .../v1/serve  ->  .../v1/log
    return String(apiBase).replace(/\/serve(\?.*)?$/, "/log");
  }

  function postLog(apiBase, payload) {
    var url = logEndpointFromServe(apiBase);
    if (!url) return;
    try {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        keepalive: true
      }).catch(function () { });
    } catch (e) { }
  }

  function ensureBaseStyle() {
    if (document.getElementById("cx-style")) return;
    var style = document.createElement("style");
    style.id = "cx-style";
    style.textContent = "\n" +
      ".cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;display:flex;align-items:center;justify-content:center;}\n" +
      ".cx-modal{background:#fff;width:min(520px,92vw);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,-apple-system,Segoe UI,Roboto;}\n" +
      ".cx-image{width:100%;max-height:260px;object-fit:cover;display:block;}\n" +
      ".cx-header{padding:18px 20px 8px;font-weight:700;font-size:18px;}\n" +
      ".cx-body{padding:0 20px 16px;font-size:14px;white-space:pre-wrap;}\n" +
      ".cx-footer{padding:0 20px 20px;display:flex;justify-content:flex-end;gap:10px;}\n" +
      ".cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}\n" +
      ".cx-btn--primary{background:#111;color:#fff;}\n" +
      ".cx-btn--ghost{background:#eee;color:#111;}\n" +
      ".cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);}\n" +
      ".cx-banner__inner{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:14px;}\n" +
      ".cx-toast{position:fixed;right:12px;bottom:12px;max-width:min(420px,92vw);background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);padding:14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;}\n";
    document.head.appendChild(style);
  }

  function ensureTemplateStyle(templateId, cssText) {
    if (!templateId || !cssText) return;
    var id = "cx-tpl-" + templateId;
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = String(cssText);
    document.head.appendChild(style);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // very small template engine:
  // - {{key}} replacement (escaped)
  // - {{#if key}} ... {{/if}} blocks
  function renderTemplate(html, vars) {
    var out = String(html || "");
    out = out.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, function (_, key, inner) {
      return vars && vars[key] ? inner : "";
    });
    out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_, key) {
      return escapeHtml(vars && vars[key] != null ? vars[key] : "");
    });
    return out;
  }

  function normalizeCreative(creative) {
    creative = creative || {};
    return {
      title: creative.title || "",
      body: creative.body || "",
      image_url: creative.image_url || creative.imageUrl || "",
      cta_text: creative.cta_text || creative.buttonText || creative.button_text || "OK",
      cta_url: creative.cta_url || creative.url || creative.href || "",
      cta_url_text: creative.cta_url_text || creative.link_text || creative.linkText || "詳細を見る",
    };
  }

  /* ------------------ RENDERERS ------------------ */

  function mountAndWireClose(rootEl, onClose) {
    function close() {
      try { rootEl.remove(); } catch (e) {}
      if (typeof onClose === "function") onClose();
    }

    // any element with data-cx-close closes
    var closers = rootEl.querySelectorAll("[data-cx-close]");
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener("click", function (e) {
        // If it's a link, let it navigate; still close.
        close();
      });
    }

    // overlay click close (if overlay exists)
    rootEl.addEventListener("click", function (e) {
      if (e.target === rootEl) close();
    });

    return { close: close };
  }

  function renderWithTemplate(action, next, apiBase, ctx) {
    var tpl = action.template;
    if (!tpl || (!tpl.html && !tpl.css)) return false;

    ensureTemplateStyle(action.templateId || (tpl && tpl.template_id), tpl.css);
    var creative = normalizeCreative(action.creative);
    var html = renderTemplate(tpl.html, creative);

    // For modal we usually want overlay root; template should include it.
    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    var root = wrapper.firstElementChild;
    if (!root) return false;

    document.body.appendChild(root);
    // impression
    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id || action.templateId || (tpl && tpl.template_id),
      event: "impression",
      url: ctx.url,
      path: ctx.path,
      ref: ctx.ref,
      vid: ctx.vid,
      sid: ctx.sid
    });

    // log clicks to creative.cta_url if present (phase-1)
    if (creative && creative.cta_url) {
      var links = root.querySelectorAll('a[href="' + creative.cta_url + '"]');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function () {
          postLog(apiBase, {
            site_id: ctx.site_id,
            scenario_id: ctx.scenario_id,
            action_id: action.action_id || action.id,
            template_id: action.template_id || action.templateId || (tpl && tpl.template_id),
            event: "click_link",
            url: ctx.url,
            path: ctx.path,
            ref: ctx.ref,
            vid: ctx.vid,
            sid: ctx.sid
          });
        });
      }
    }

    mountAndWireClose(root, function () {
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || action.templateId || (tpl && tpl.template_id),
        event: "close",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      });
      if (typeof next === 'function') next();
    });
    return true;
  }

  function renderModal(action, next, apiBase, ctx) {
    ensureBaseStyle();
    if (renderWithTemplate(action, next, apiBase, ctx)) return;

    var creative = normalizeCreative(action.creative);

    var overlay = document.createElement("div");
    overlay.className = "cx-overlay";
    var modal = document.createElement("div");
    modal.className = "cx-modal";

    if (creative.image_url) {
      // 先に画像だけ読み込み→OKなら表示
      preloadImage(creative.image_url, function(ok) {
        if (!ok) return; // 失敗なら画像なしでOK
        var img = document.createElement("img");
        img.className = "cx-image";
        img.src = creative.image_url;
        img.alt = creative.title || "creative";
        // modalの先頭に入れる（headerより上）
        modal.insertBefore(img, modal.firstChild);
      });
    }

    if (creative.title) {
      var header = document.createElement("div");
      header.className = "cx-header";
      header.textContent = creative.title;
      modal.appendChild(header);
    }

    if (creative.body) {
      var body = document.createElement("div");
      body.className = "cx-body";
      body.textContent = creative.body;
      modal.appendChild(body);
    }

    var footer = document.createElement("div");
    footer.className = "cx-footer";

    if (creative.cta_url) {
      var linkBtn = document.createElement("a");
      linkBtn.className = "cx-btn cx-btn--ghost";
      linkBtn.href = creative.cta_url;
      linkBtn.target = "_blank";
      linkBtn.rel = "noopener noreferrer";
      linkBtn.textContent = creative.cta_url_text || "詳細を見る";
      linkBtn.addEventListener("click", function () {
        postLog(apiBase, {
          site_id: ctx.site_id,
          scenario_id: ctx.scenario_id,
          action_id: action.action_id || action.id,
          template_id: action.template_id,
          event: "click_link",
          url: ctx.url,
          path: ctx.path,
          ref: ctx.ref,
          vid: ctx.vid,
          sid: ctx.sid
        });
      });
      footer.appendChild(linkBtn);
    }

    var okBtn = document.createElement("button");
    okBtn.className = "cx-btn cx-btn--primary";
    okBtn.type = "button";
    okBtn.textContent = creative.cta_text || "OK";
    footer.appendChild(okBtn);

    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // impression
    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id,
      event: "impression",
      url: ctx.url,
      path: ctx.path,
      ref: ctx.ref,
      vid: ctx.vid,
      sid: ctx.sid
    });

    function close() {
      try { overlay.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id,
        event: "close",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      });
      if (typeof next === "function") next();
    }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    okBtn.addEventListener("click", close);
  }

  function renderBanner(action, next, apiBase, ctx) {
    ensureBaseStyle();
    if (renderWithTemplate(action, next, apiBase, ctx)) return;

    var creative = normalizeCreative(action.creative);
    var banner = document.createElement("div");
    banner.className = "cx-banner";
    var inner = document.createElement("div");
    inner.className = "cx-banner__inner";
    var text = document.createElement("div");
    text.textContent = creative.title || "";

    inner.appendChild(text);
    if (creative.cta_url) {
      var linkBtn = document.createElement("a");
      linkBtn.className = "cx-btn cx-btn--ghost";
      linkBtn.href = creative.cta_url;
      linkBtn.target = "_blank";
      linkBtn.rel = "noopener noreferrer";
      linkBtn.textContent = creative.cta_url_text || "詳細を見る";
      inner.appendChild(linkBtn);
    }
    var closeBtn = document.createElement("button");
    closeBtn.className = "cx-btn cx-btn--primary";
    closeBtn.type = "button";
    closeBtn.textContent = creative.cta_text || "OK";
    inner.appendChild(closeBtn);

    banner.appendChild(inner);
    document.body.appendChild(banner);

    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id,
      event: "impression",
      url: ctx.url,
      path: ctx.path,
      ref: ctx.ref,
      vid: ctx.vid,
      sid: ctx.sid
    });

    function close() {
      try { banner.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id,
        event: "close",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      });
      if (typeof next === "function") next();
    }
    closeBtn.addEventListener("click", close);

    if (creative.cta_url) {
      var links = banner.querySelectorAll('a[href="' + creative.cta_url + '"]');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function () {
          postLog(apiBase, {
            site_id: ctx.site_id,
            scenario_id: ctx.scenario_id,
            action_id: action.action_id || action.id,
            template_id: action.template_id,
            event: "click_link",
            url: ctx.url,
            path: ctx.path,
            ref: ctx.ref,
            vid: ctx.vid,
            sid: ctx.sid
          });
        });
      }
    }
  }

  function renderToast(action, next, apiBase, ctx) {
    ensureBaseStyle();
    if (renderWithTemplate(action, next, apiBase, ctx)) return;

    var creative = normalizeCreative(action.creative);
    var toast = document.createElement("div");
    toast.className = "cx-toast";
    toast.textContent = creative.title || creative.body || "";
    document.body.appendChild(toast);

    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id,
      event: "impression",
      url: ctx.url,
      path: ctx.path,
      ref: ctx.ref,
      vid: ctx.vid,
      sid: ctx.sid
    });

    var timer = setTimeout(function () {
      try { toast.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id,
        event: "close",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      });
      if (typeof next === "function") next();
    }, 5000);
    toast.addEventListener("click", function () {
      clearTimeout(timer);
      try { toast.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id,
        event: "click",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      });
      if (creative.cta_url) {
        try { window.open(creative.cta_url, "_blank"); } catch (e) {}
      }
      if (typeof next === "function") next();
    });
  }

  /* ------------------ ACTION CHAIN ------------------ */

  function runActions(actions, apiBase, ctx) {
    if (!actions || !actions.length) return;
    var index = 0;
    function next() {
      var action = actions[index++];
      if (!action) return;
      var t = (action.type || "modal");
      if (t === "banner") return renderBanner(action, next, apiBase, ctx);
      if (t === "toast") return renderToast(action, next, apiBase, ctx);
      return renderModal(action, next, apiBase, ctx);
    }
    next();
  }

  /* ------------------ SCENARIO ------------------ */

  function pageTypeFromPath(pathname) {
    if (!pathname) return "other";
    if (pathname.indexOf("/product") >= 0) return "product";
    if (pathname.indexOf("/blog") >= 0 || pathname.indexOf("/post") >= 0) return "blog_post";
    return "other";
  }

  function shouldRunScenario(s, ctx) {
    if (!s || s.status !== "active") return false;
    var er = s.entry_rules || {};
    var allowed = er.page && Array.isArray(er.page.page_type_in) ? er.page.page_type_in : null;
    if (allowed && allowed.length) {
      if (allowed.indexOf(ctx.page_type) === -1) return false;
    }
    return true;
  }

  function scheduleScenario(s, ctx, apiBase) {
    var er = s.entry_rules || {};
    var trigger = er.trigger || { type: "immediate", ms: 0 };
    var waitMs = Number(trigger.ms || 0);
    if (er.behavior && er.behavior.stay_gte_sec) {
      waitMs = Math.max(waitMs, Number(er.behavior.stay_gte_sec) * 1000);
    }
    setTimeout(function () {
      var actions = Array.isArray(s.actions) ? s.actions : [];
      if (!actions.length) {
        log("[cx] no actions in scenario", s.scenario_id);
        return;
      }
      ctx.scenario_id = s.scenario_id || s.id;
      runActions(actions, apiBase, ctx);
    }, waitMs);
  }

  function main() {
    var script = getCurrentScript();
    if (!script) return;

    var siteId = script.getAttribute("data-site-id") || "";
    var apiBase = script.getAttribute("data-api-base") || "";
    if (!siteId || !apiBase) {
      log("[cx] missing data-site-id or data-api-base");
      return;
    }

    var ctx = {
      site_id: siteId,
      url: window.location.href,
      path: window.location.pathname,
      ref: document.referrer || "",
      page_type: script.getAttribute("data-page-type") || pageTypeFromPath(window.location.pathname),
      vid: getOrCreateId('cx_vid'),
      sid: getOrCreateId('cx_sid_' + siteId)
    };

    var siteKey = script.getAttribute("data-site-key") || "";

    fetch(apiBase + (apiBase.indexOf("?") >= 0 ? "&" : "?") + qs(ctx), {
        method: "GET",
        headers: siteKey ? { "X-Site-Key": siteKey } : {},
        credentials: "omit"
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var scenarios = (data && data.scenarios) || [];
        if (!Array.isArray(scenarios) || !scenarios.length) return;

        scenarios.sort(function (a, b) { return Number((b.priority || 0)) - Number((a.priority || 0)); });
        for (var i = 0; i < scenarios.length; i++) {
          var s = scenarios[i];
          if (!shouldRunScenario(s, ctx)) continue;
          scheduleScenario(s, ctx, apiBase);
          break;
        }
      })
      .catch(function (e) {
        console.error("[cx] serve failed", e);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
