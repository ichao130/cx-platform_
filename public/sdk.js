/* cx-platform SDK v5 (DOM mount + shadow/theme/inherit + placement) */
(function () {
  "use strict";

  var SCRIPT_ATTR = "data-site-id";

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

  function getScriptOrigin(script) {
    try {
      if (script && script.src) return new URL(script.src, window.location.href).origin;
    } catch (e) {}
    try {
      return window.location.origin || "";
    } catch (e2) {
      return "";
    }
  }

  function defaultApiBaseFromScript(script) {
    var origin = getScriptOrigin(script);
    if (!origin) return "";
    return origin + "/api/v1/serve";
  }

  function resolveApiBase(script) {
    var attr = "";
    try {
      attr = String((script && script.getAttribute && script.getAttribute("data-api-base")) || "").trim();
    } catch (e) {
      attr = "";
    }
    if (attr) return attr;
    return defaultApiBaseFromScript(script);
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
  function setCookieId(key, value) {
    try {
      var expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = key + "=" + value + "; expires=" + expires + "; path=/; SameSite=Lax";
    } catch (e) {}
  }

  function getOrCreateId(key) {
    try {
      var v = localStorage.getItem(key);
      if (v) {
        // Shopify Web Pixel がcookieからも読めるよう同期
        setCookieId(key, v);
        return v;
      }
      v = "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();
      localStorage.setItem(key, v);
      setCookieId(key, v);
      return v;
    } catch (e) {
      return "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    }
  }

  // セッションID専用: sessionStorage を使うのでブラウザを閉じると消える（タブ間非共有）
  // 30分以上操作がなければ新しいセッションとして扱う
  function getOrCreateSessionId(key) {
    var TIMEOUT_MS = 30 * 60 * 1000;
    var tsKey = key + "_ts";
    try {
      var now = Date.now();
      var v = sessionStorage.getItem(key);
      var ts = Number(sessionStorage.getItem(tsKey) || 0);
      if (v && now - ts < TIMEOUT_MS) {
        sessionStorage.setItem(tsKey, String(now));
        setCookieId(key, v);
        return v;
      }
      v = "sid_" + Math.random().toString(36).slice(2) + "_" + Date.now();
      sessionStorage.setItem(key, v);
      sessionStorage.setItem(tsKey, String(now));
      setCookieId(key, v);
      return v;
    } catch (e) {
      return "sid_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    }
  }

  function logEndpointFromServe(apiBase) {
    if (!apiBase) return "";
    // .../v1/serve  ->  .../v1/log
    return String(apiBase).replace(/\/serve(\?.*)?$/, "/log");
  }

  function postLog(apiBase, payload, siteId, siteKey) {
    var base = logEndpointFromServe(apiBase);
    if (!base) return;
    // OPTIONSプリフライトでも site_id を参照できるよう query param に付与
    var url = base + (base.indexOf("?") >= 0 ? "&" : "?") + "site_id=" + encodeURIComponent(siteId || "");
    try {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Site-Id": siteId,
          "X-Site-Key": siteKey
        },
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

  function ensureTemplateStyle(templateId, cssText, root) {
    if (!templateId || !cssText) return;
    // root: document or shadowRoot
    var id = "cx-tpl-" + templateId;
    var exists = root && root.getElementById ? root.getElementById(id) : document.getElementById(id);
    if (exists) return;

    var style = document.createElement("style");
    style.id = id;
    style.textContent = String(cssText);

    if (root && root.host && root.appendChild) root.appendChild(style);
    else document.head.appendChild(style);
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
      coupon_code: creative.coupon_code || ""
    };
  }

  // ------------------ DOM MOUNT ------------------
  function pickMount(action) {
    var m = action && action.mount ? action.mount : null;
    if (!m) return null;
    if (!m.selector) return null;
    return {
      selector: String(m.selector),
      placement: String(m.placement || "append"),
      mode: String(m.mode || "shadow") // shadow|theme|inherit
    };
  }

  function applyPlacement(target, el, placement) {
    if (!target || !el) return false;
    var p = placement || "append";
    if (p === "prepend") {
      target.insertBefore(el, target.firstChild);
      return true;
    }
    if (p === "before") {
      if (!target.parentNode) return false;
      target.parentNode.insertBefore(el, target);
      return true;
    }
    if (p === "after") {
      if (!target.parentNode) return false;
      target.parentNode.insertBefore(el, target.nextSibling);
      return true;
    }
    // append
    target.appendChild(el);
    return true;
  }

  function computeThemeVarsFrom(targetEl) {
    try {
      var cs = window.getComputedStyle(targetEl || document.documentElement);
      return {
        "--cx-font": cs.fontFamily || "system-ui",
        "--cx-text": cs.color || "#111",
        "--cx-bg": cs.backgroundColor || "#fff",
        "--cx-radius": "14px",
        "--cx-primary": (getComputedStyle(document.documentElement).getPropertyValue("--primary") || "").trim() || "#111"
      };
    } catch (e) {
      return {
        "--cx-font": "system-ui",
        "--cx-text": "#111",
        "--cx-bg": "#fff",
        "--cx-radius": "14px",
        "--cx-primary": "#111"
      };
    }
  }

  function createMountHost(targetEl, mount, templateId) {
    var host = document.createElement("div");
    host.className = "cx-host";
    host.setAttribute("data-cx-host", "1");
    if (templateId) host.setAttribute("data-cx-template-id", String(templateId));
    if (mount && mount.mode) host.setAttribute("data-cx-mode", String(mount.mode));
    host.style.all = "initial"; // reset most properties (for safety); theme/inherit can override

    // theme vars
    if (mount && mount.mode === "theme") {
      var vars = computeThemeVarsFrom(targetEl);
      for (var k in vars) host.style.setProperty(k, vars[k]);
    }

    // place it
    applyPlacement(targetEl, host, mount.placement);

    return host;
  }

  function mountRootFor(host, mount) {
    if (!host) return { root: null, remove: function () {} };

    // inherit: light DOM
    if (mount && mount.mode === "inherit") {
      host.style.all = ""; // allow styles to flow
      host.className = "cx-root"; // for scoping
      return { root: host, remove: function () { try { host.remove(); } catch (e) {} } };
    }

    // shadow/theme/shadow
    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : null;
    if (!shadow) {
      // fallback to inherit if shadow not available
      host.style.all = "";
      host.className = "cx-root";
      return { root: host, remove: function () { try { host.remove(); } catch (e) {} } };
    }

    // base inside shadow: allow tokens
    var base = document.createElement("style");
    base.textContent =
      ":host{display:contents;}"+
      ".cx-scope{all:initial;display:block;font-family:var(--cx-font,system-ui,-apple-system,'Segoe UI',sans-serif);font-size:14px;line-height:1.5;color:var(--cx-text,#111);}"+
      ".cx-scope *{box-sizing:border-box;}";

    shadow.appendChild(base);

    var scope = document.createElement("div");
    scope.className = "cx-scope";
    shadow.appendChild(scope);

    return {
      root: scope,
      shadowRoot: shadow,
      remove: function () { try { host.remove(); } catch (e) {} }
    };
  }

  /* ------------------ RENDERERS ------------------ */

  // data-cx-copy="<text>" ボタンをクリックするとクリップボードにコピーし、
  // ボタンラベルを一時的に「コピーしました！」に変更する
  function wireCopyButtons(rootEl) {
    var btns = rootEl.querySelectorAll("[data-cx-copy]");
    for (var i = 0; i < btns.length; i++) {
      (function(btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var text = btn.getAttribute("data-cx-copy") || "";
          if (!text) return;
          try {
            navigator.clipboard.writeText(text).then(function () {
              var orig = btn.textContent;
              btn.textContent = "コピーしました！";
              btn.setAttribute("data-cx-copied", "1");
              setTimeout(function () {
                btn.textContent = orig;
                btn.removeAttribute("data-cx-copied");
              }, 2000);
            });
          } catch (e2) {
            // fallback
            try {
              var ta = document.createElement("textarea");
              ta.value = text;
              ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              ta.remove();
              var orig2 = btn.textContent;
              btn.textContent = "コピーしました！";
              btn.setAttribute("data-cx-copied", "1");
              setTimeout(function () {
                btn.textContent = orig2;
                btn.removeAttribute("data-cx-copied");
              }, 2000);
            } catch (e3) {}
          }
        });
      })(btns[i]);
    }
  }

  function mountAndWireClose(rootEl, onClose, removeHost) {
    function close() {
      try { if (removeHost) removeHost(); else rootEl.remove(); } catch (e) {}
      if (typeof onClose === "function") onClose();
    }

    // any element with data-cx-close closes
    var closers = rootEl.querySelectorAll("[data-cx-close]");
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener("click", function () { close(); });
    }

    // overlay click close (if overlay exists)
    rootEl.addEventListener("click", function (e) {
      if (e.target === rootEl) close();
    });

    return { close: close };
  }

  // 画像を事前ロードしてからコールバックを呼ぶ
  // render 時は 1000ms だけ待ち、キャッシュ済みなら即時反映・未ロードなら即表示
  function preloadImage(url, callback) {
    if (!url) { callback(); return; }
    var done = false;
    var timeout = setTimeout(function() {
      if (!done) { done = true; callback(); }
    }, 1000);
    var img = new Image();
    img.onload = img.onerror = function() {
      if (!done) { done = true; clearTimeout(timeout); callback(); }
    };
    img.src = url;
  }

  // serve レスポンスからすべての画像を先行プリロード（fire-and-forget）
  function warmupImages(scenarios) {
    var seen = {};
    (scenarios || []).forEach(function(s) {
      (s.actions || []).forEach(function(a) {
        var url = (a.creative && (a.creative.image_url || a.creative.imageUrl)) || "";
        if (url && !seen[url]) {
          seen[url] = true;
          var img = new Image();
          img.src = url;
        }
      });
    });
  }

  function renderWithTemplate(action, next, apiBase, ctx, mount) {
    var tpl = action.template;
    if (!tpl || (!tpl.html && !tpl.css)) return false;

    var templateId = action.templateId || action.template_id || (tpl && tpl.template_id) || "";
    var creative = normalizeCreative(action.creative);

    // 画像を先にプリロードしてから DOM に挿入
    preloadImage(creative.image_url, function() {
      // mount
      var hostHandle = null;
      var rootForInsert = document.body;

      if (mount && mount.selector && (action.type || "modal") !== "modal") {
        var target = null;
        try { target = document.querySelector(mount.selector); } catch (e) { target = null; }
        if (!target) {
          log("[cx] mount target not found:", mount.selector);
          return;
        }

        var host = createMountHost(target, mount, templateId);
        hostHandle = mountRootFor(host, mount);
        rootForInsert = hostHandle.root || host;
        ensureTemplateStyle(templateId, tpl.css, hostHandle.shadowRoot || null);
      } else {
        // modal/banner/toast -> global
        ensureTemplateStyle(templateId, tpl.css, null);
      }

      var html = renderTemplate(tpl.html, creative);

      var wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      var root = wrapper.firstElementChild;
      if (!root) return;

      // insert
      if (rootForInsert && rootForInsert.appendChild) rootForInsert.appendChild(root);
      else document.body.appendChild(root);

      // impression
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: templateId || null,
        variant_id: ctx.variant_id || null,
        event: "impression",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      // log clicks to creative.cta_url if present
      if (creative && creative.cta_url) {
        var links = root.querySelectorAll('a[href="' + creative.cta_url + '"]');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener("click", function () {
            postLog(apiBase, {
              site_id: ctx.site_id,
              scenario_id: ctx.scenario_id,
              action_id: action.action_id || action.id,
              template_id: templateId || null,
              variant_id: ctx.variant_id || null,
              event: "click_link",
              url: ctx.url,
              path: ctx.path,
              ref: ctx.ref,
              vid: ctx.vid,
              sid: ctx.sid
            }, ctx.site_id, ctx.site_key);
            // クリックベース: click_link 時にゴール登録
            if (ctx.pending_click_goal) {
              var pcg = ctx.pending_click_goal;
              registerGoal(ctx.site_id, pcg.scenarioId, pcg.actionId, pcg.variantId, pcg.goal);
              ctx.pending_click_goal = null;
            }
          });
        }
      }

      // data-cx-copy ボタン（クーポンコードなど）
      wireCopyButtons(root);

      mountAndWireClose(root, function () {
        postLog(apiBase, {
          site_id: ctx.site_id,
          scenario_id: ctx.scenario_id,
          action_id: action.action_id || action.id,
          template_id: templateId || null,
          variant_id: ctx.variant_id || null,
          event: "close",
          url: ctx.url,
          path: ctx.path,
          ref: ctx.ref,
          vid: ctx.vid,
          sid: ctx.sid
        }, ctx.site_id, ctx.site_key);

        if (typeof next === "function") next();
      }, hostHandle ? hostHandle.remove : null);
    }); // end preloadImage callback

    return true;
  }

  function renderModal(action, next, apiBase, ctx) {
    // template優先（global）- テンプレートがある場合はbaseStyleを注入しない（競合防止）
    if (renderWithTemplate(action, next, apiBase, ctx, null)) return;

    // テンプレートなし時のフォールバック
    ensureBaseStyle();

    var creative = normalizeCreative(action.creative);

    preloadImage(creative.image_url, function() {
    var overlay = document.createElement("div");
    overlay.className = "cx-overlay";
    var modal = document.createElement("div");
    modal.className = "cx-modal";

    if (creative.image_url) {
      var img = document.createElement("img");
      img.className = "cx-image";
      img.src = creative.image_url;
      img.alt = creative.title || "creative";
      modal.appendChild(img);
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
          template_id: action.template_id || null,
          variant_id: ctx.variant_id || null,
          event: "click_link",
          url: ctx.url,
          path: ctx.path,
          ref: ctx.ref,
          vid: ctx.vid,
          sid: ctx.sid
        }, ctx.site_id, ctx.site_key);
        if (ctx.pending_click_goal) {
          var pcg = ctx.pending_click_goal;
          registerGoal(ctx.site_id, pcg.scenarioId, pcg.actionId, pcg.variantId, pcg.goal);
          ctx.pending_click_goal = null;
        }
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
      template_id: action.template_id || null,
      variant_id: ctx.variant_id || null,
      event: "impression",
      url: ctx.url,
      path: ctx.path,
      ref: ctx.ref,
      vid: ctx.vid,
      sid: ctx.sid
    }, ctx.site_id, ctx.site_key);

    function close() {
      try { overlay.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "close",
        url: ctx.url,
        path: ctx.path,
        ref: ctx.ref,
        vid: ctx.vid,
        sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      if (typeof next === "function") next();
    }

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    okBtn.addEventListener("click", close);
    }); // end preloadImage callback
  }

  function renderBanner(action, next, apiBase, ctx) {
    var mount = pickMount(action);
    if (renderWithTemplate(action, next, apiBase, ctx, mount)) return;
    ensureBaseStyle();

    // mountがある場合は固定position bannerよりも “自然に差し込む” が優先
    if (mount && mount.selector) {
      // templateが無い場合のDOM banner
      var target = null;
      try { target = document.querySelector(mount.selector); } catch (e) { target = null; }
      if (!target) return;

      var host = createMountHost(target, mount, action.template_id || "");
      var handle = mountRootFor(host, mount);
      var root = handle.root || host;

      var creative = normalizeCreative(action.creative);
      var box = document.createElement("div");
      box.className = "cx-inline-banner";
      box.style.cssText = "padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:var(--cx-bg,#fff);color:var(--cx-text,#111);font-family:var(--cx-font,system-ui);display:flex;gap:10px;align-items:center;justify-content:space-between;";

      var text = document.createElement("div");
      text.textContent = creative.title || creative.body || "";
      box.appendChild(text);

      var right = document.createElement("div");
      right.style.cssText = "display:flex;gap:10px;align-items:center;";

      if (creative.cta_url) {
        var a = document.createElement("a");
        a.href = creative.cta_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = creative.cta_url_text || "詳細を見る";
        a.style.cssText = "text-decoration:underline;cursor:pointer;";
        a.addEventListener("click", function () {
          postLog(apiBase, {
            site_id: ctx.site_id,
            scenario_id: ctx.scenario_id,
            action_id: action.action_id || action.id,
            template_id: action.template_id || null,
            variant_id: ctx.variant_id || null,
            event: "click_link",
            url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
          }, ctx.site_id, ctx.site_key);
          if (ctx.pending_click_goal) {
            var pcg = ctx.pending_click_goal;
            registerGoal(ctx.site_id, pcg.scenarioId, pcg.actionId, pcg.variantId, pcg.goal);
            ctx.pending_click_goal = null;
          }
        });
        right.appendChild(a);
      }

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = creative.cta_text || "OK";
      closeBtn.style.cssText = "border:0;border-radius:10px;padding:8px 12px;cursor:pointer;background:var(--cx-primary,#111);color:#fff;font-weight:700;";
      right.appendChild(closeBtn);

      box.appendChild(right);
      root.appendChild(box);

      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "impression",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      closeBtn.addEventListener("click", function () {
        try { handle.remove(); } catch (e) {}
        postLog(apiBase, {
          site_id: ctx.site_id,
          scenario_id: ctx.scenario_id,
          action_id: action.action_id || action.id,
          template_id: action.template_id || null,
          variant_id: ctx.variant_id || null,
          event: "close",
          url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
        }, ctx.site_id, ctx.site_key);

        if (typeof next === "function") next();
      });

      return;
    }

    // 従来のfixed banner
    var creative2 = normalizeCreative(action.creative);
    var banner = document.createElement("div");
    banner.className = "cx-banner";
    var inner = document.createElement("div");
    inner.className = "cx-banner__inner";
    var text2 = document.createElement("div");
    text2.textContent = creative2.title || "";

    inner.appendChild(text2);
    if (creative2.cta_url) {
      var linkBtn2 = document.createElement("a");
      linkBtn2.className = "cx-btn cx-btn--ghost";
      linkBtn2.href = creative2.cta_url;
      linkBtn2.target = "_blank";
      linkBtn2.rel = "noopener noreferrer";
      linkBtn2.textContent = creative2.cta_url_text || "詳細を見る";
      inner.appendChild(linkBtn2);
    }
    var closeBtn2 = document.createElement("button");
    closeBtn2.className = "cx-btn cx-btn--primary";
    closeBtn2.type = "button";
    closeBtn2.textContent = creative2.cta_text || "OK";
    inner.appendChild(closeBtn2);

    banner.appendChild(inner);
    document.body.appendChild(banner);

    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id || null,
      variant_id: ctx.variant_id || null,
      event: "impression",
      url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
    }, ctx.site_id, ctx.site_key);

    function close2() {
      try { banner.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "close",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      if (typeof next === "function") next();
    }
    closeBtn2.addEventListener("click", close2);

    if (creative2.cta_url) {
      var links2 = banner.querySelectorAll('a[href="' + creative2.cta_url + '"]');
      for (var j = 0; j < links2.length; j++) {
        links2[j].addEventListener("click", function () {
          postLog(apiBase, {
            site_id: ctx.site_id,
            scenario_id: ctx.scenario_id,
            action_id: action.action_id || action.id,
            template_id: action.template_id || null,
            variant_id: ctx.variant_id || null,
            event: "click_link",
            url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
          }, ctx.site_id, ctx.site_key);
          if (ctx.pending_click_goal) {
            var pcg = ctx.pending_click_goal;
            registerGoal(ctx.site_id, pcg.scenarioId, pcg.actionId, pcg.variantId, pcg.goal);
            ctx.pending_click_goal = null;
          }
        });
      }
    }
  }

  function renderToast(action, next, apiBase, ctx) {
    var mount = pickMount(action);
    if (renderWithTemplate(action, next, apiBase, ctx, mount)) return;
    ensureBaseStyle();

    if (mount && mount.selector) {
      var target = null;
      try { target = document.querySelector(mount.selector); } catch (e) { target = null; }
      if (!target) return;

      var host = createMountHost(target, mount, action.template_id || "");
      var handle = mountRootFor(host, mount);
      var root = handle.root || host;

      var creative = normalizeCreative(action.creative);
      var toast = document.createElement("div");
      toast.textContent = creative.title || creative.body || "";
      toast.style.cssText = "padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:var(--cx-bg,#fff);color:var(--cx-text,#111);font-family:var(--cx-font,system-ui);cursor:pointer;";
      root.appendChild(toast);

      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "impression",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      var timer = setTimeout(function () {
        try { handle.remove(); } catch (e) {}
        postLog(apiBase, {
          site_id: ctx.site_id,
          scenario_id: ctx.scenario_id,
          action_id: action.action_id || action.id,
          template_id: action.template_id || null,
          variant_id: ctx.variant_id || null,
          event: "close",
          url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
        }, ctx.site_id, ctx.site_key);

        if (typeof next === "function") next();
      }, 5000);

      toast.addEventListener("click", function () {
        clearTimeout(timer);
        postLog(apiBase, {
          site_id: ctx.site_id,
          scenario_id: ctx.scenario_id,
          action_id: action.action_id || action.id,
          template_id: action.template_id || null,
          variant_id: ctx.variant_id || null,
          event: "click",
          url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
        }, ctx.site_id, ctx.site_key);

        if (creative.cta_url) {
          try { window.open(creative.cta_url, "_blank"); } catch (e) {}
        }
        try { handle.remove(); } catch (e) {}

        if (typeof next === "function") next();
      });
      return;
    }

    // 従来のfixed toast
    var creative2 = normalizeCreative(action.creative);

    // 表示設定
    var toastPos = creative2.toast_position || "bottom-right";
    var toastOffset = Number(creative2.toast_bottom != null ? creative2.toast_bottom : 12);
    var durationMs = creative2.toast_duration_sec != null ? Number(creative2.toast_duration_sec) * 1000 : 5000;
    var clickAction = creative2.toast_click_action || "close_and_url";

    var isTop = toastPos.indexOf("top") === 0;
    var isLeft = toastPos.indexOf("left") >= 0;
    var posStyle = (isTop ? "top:" : "bottom:") + toastOffset + "px;" + (isLeft ? "left:" : "right:") + toastOffset + "px;";

    var toast2 = document.createElement("div");
    toast2.className = "cx-toast";
    toast2.style.cssText = posStyle;
    toast2.textContent = creative2.title || creative2.body || "";
    document.body.appendChild(toast2);

    postLog(apiBase, {
      site_id: ctx.site_id,
      scenario_id: ctx.scenario_id,
      action_id: action.action_id || action.id,
      template_id: action.template_id || null,
      variant_id: ctx.variant_id || null,
      event: "impression",
      url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
    }, ctx.site_id, ctx.site_key);

    var timer2 = durationMs > 0 ? setTimeout(function () {
      try { toast2.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "close",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      if (typeof next === "function") next();
    }, durationMs) : null;

    toast2.addEventListener("click", function () {
      if (clickAction === "none") return;
      if (timer2) clearTimeout(timer2);
      if (clickAction !== "none") {
        try { toast2.remove(); } catch (e) {}
      }
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "click",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      if (clickAction === "close_and_url" && creative2.cta_url) {
        try { window.open(creative2.cta_url, "_blank"); } catch (e) {}
      }
      if (typeof next === "function") next();
    });
  }

  /* ------------------ LAUNCHER ------------------ */

  function renderLauncher(action, next, apiBase, ctx) {
    var creative = normalizeCreative(action.creative);
    var pos = String(creative.launcher_position || "right");
    var lBottom = Number(creative.launcher_bottom != null ? creative.launcher_bottom : 20);
    var label = creative.cta_text || "お問い合わせ";

    // テンプレートがある場合はそれでランチャーボタンを描画
    if (action.template && action.template.html) {
      var mount = { mode: "shadow" };
      var host = document.createElement("div");
      host.setAttribute("data-cx-host", "1");
      host.style.cssText = "position:fixed;bottom:" + lBottom + "px;" + (pos === "left" ? "left:" + lBottom + "px;" : "right:" + lBottom + "px;") + "z-index:2147483645;";
      document.body.appendChild(host);

      var handle = mountRootFor(host, mount);
      var root = handle.root || host;
      var tpl = action.template;
      ensureTemplateStyle(tpl.template_id || tpl.templateId, tpl.css, handle.shadowRoot || null);
      root.innerHTML = renderTemplate(tpl.html, creative);

      var openBtn = root.querySelector("[data-cx-launcher-open]") || root.firstElementChild;
      if (openBtn) {
        openBtn.style.cursor = "pointer";
        openBtn.addEventListener("click", function () {
          postLog(apiBase, { site_id: ctx.site_id, scenario_id: ctx.scenario_id, action_id: action.action_id, variant_id: ctx.variant_id || null, event: "click", url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid }, ctx.site_id, ctx.site_key);
          // モーダルとして同じクリエイティブを表示
          var modalAction = { action_id: action.action_id, type: "modal", creative: action.modal_creative || action.creative, template: action.modal_template || null };
          renderModal(modalAction, function () {}, apiBase, ctx);
        });
      }

      postLog(apiBase, { site_id: ctx.site_id, scenario_id: ctx.scenario_id, action_id: action.action_id, variant_id: ctx.variant_id || null, event: "impression", url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid }, ctx.site_id, ctx.site_key);
      if (typeof next === "function") next();
      return;
    }

    // テンプレートなし: ビルトインのフローティングボタン
    ensureBaseStyle();
    var btn = document.createElement("button");
    btn.className = "cx-launcher";
    btn.textContent = label;
    btn.style.cssText = "position:fixed;bottom:" + lBottom + "px;" + (pos === "left" ? "left:" + lBottom + "px;" : "right:" + lBottom + "px;") +
      "z-index:2147483645;background:#111;color:#fff;border:none;border-radius:50px;padding:12px 20px;" +
      "font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);display:flex;align-items:center;gap:8px;";
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      postLog(apiBase, { site_id: ctx.site_id, scenario_id: ctx.scenario_id, action_id: action.action_id, variant_id: ctx.variant_id || null, event: "click", url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid }, ctx.site_id, ctx.site_key);
      var modalAction = { action_id: action.action_id, type: "modal", creative: action.modal_creative || action.creative, template: null };
      renderModal(modalAction, function () {}, apiBase, ctx);
    });

    postLog(apiBase, { site_id: ctx.site_id, scenario_id: ctx.scenario_id, action_id: action.action_id, variant_id: ctx.variant_id || null, event: "impression", url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid }, ctx.site_id, ctx.site_key);
    if (typeof next === "function") next();
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
      if (t === "launcher") return renderLauncher(action, next, apiBase, ctx);
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

  function normalizeUrlForMatch(s) {
    s = String(s || "");
    // query/hash を無視して判定したいならここで落とす
    // ただし target=url のとき query まで含めたい場合もあるので、必要ならコメントアウト
    // s = s.split("#")[0].split("?")[0];

    // 末尾スラッシュを揃える（about と about/ の差を吸収）
    if (s.length > 1) s = s.replace(/\/+$/, "");
    return s;
  }

  function matchStringRule(actual, mode, expected) {
    actual = String(actual || "");
    expected = String(expected || "");
    if (!expected) return true; // value空なら条件なし扱い

    var a = normalizeUrlForMatch(actual);
    var e = normalizeUrlForMatch(expected);

    mode = String(mode || "contains");
    if (mode === "equals") return a === e;
    if (mode === "contains") return a.indexOf(e) !== -1;
    if (mode === "starts_with" || mode === "prefix") return a.indexOf(e) === 0;
    if (mode === "regex") {
      try { return new RegExp(expected).test(actual); } catch (e2) { return false; }
    }
    // unknown mode -> contains
    return a.indexOf(e) !== -1;
  }

  function shouldRunUrlRule(er, ctx) {
    // 新フォーマット: urls配列（OR条件）
    var urls = er && er.page && Array.isArray(er.page.urls) ? er.page.urls : null;
    if (urls && urls.length) {
      for (var i = 0; i < urls.length; i++) {
        var r = urls[i];
        var t = String(r.target || "path");
        var actual = t === "url" ? (ctx.url || "") : (ctx.path || "");
        if (matchStringRule(actual, r.mode || "contains", r.value || "")) return true;
      }
      return false;
    }

    // 旧フォーマット: url単体（後方互換）
    var rule = er && er.page && er.page.url ? er.page.url : null;
    if (!rule) return true;

    var target = String(rule.target || "url");
    var actual2 = target === "path" ? (ctx.path || "") : (ctx.url || "");
    return matchStringRule(actual2, rule.mode || "contains", rule.value || "");
  }


  // ─── コンバージョン計測 ───────────────────────────────────────────
  // シナリオが発火したときにゴールをsessionStorageに登録する
  function registerGoal(siteId, scenarioId, actionId, variantId, goal) {
    if (!goal || !goal.type || !goal.value) return;
    var storageKey = "cx_goals_" + siteId;
    try {
      var stored = sessionStorage.getItem(storageKey);
      var goals = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(goals)) goals = [];
      // 同じscenario_idが既に登録済みなら重複登録しない
      for (var gi = 0; gi < goals.length; gi++) {
        if (goals[gi].scenario_id === scenarioId) return;
      }
      goals.push({
        scenario_id: scenarioId,
        action_id: actionId || null,
        variant_id: variantId || null,
        goal_type: String(goal.type || ""),
        goal_value: String(goal.value || ""),
      });
      sessionStorage.setItem(storageKey, JSON.stringify(goals));
    } catch (e) {}
  }

  // ページ読み込み時にsessionStorage内のゴールと現在URLを照合し、マッチしたらCVイベントを送信
  function checkPendingConversions(apiBase, ctx) {
    var storageKey = "cx_goals_" + ctx.site_id;
    try {
      var stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      var goals = JSON.parse(stored);
      if (!Array.isArray(goals) || !goals.length) return;
      var remaining = [];
      for (var ci = 0; ci < goals.length; ci++) {
        var g = goals[ci];
        var matched = false;
        if (g.goal_type === "path_prefix") {
          matched = ctx.path.indexOf(g.goal_value) === 0;
        } else if (g.goal_type === "path_exact") {
          matched = ctx.path === g.goal_value;
        } else if (g.goal_type === "url_contains") {
          matched = ctx.url.indexOf(g.goal_value) >= 0;
        }
        if (matched) {
          postLog(apiBase, {
            site_id: ctx.site_id,
            scenario_id: g.scenario_id,
            action_id: g.action_id || null,
            variant_id: g.variant_id || null,
            event: "conversion",
            url: ctx.url,
            path: ctx.path,
            vid: ctx.vid,
            sid: ctx.sid,
          }, ctx.site_id, ctx.site_key);
          log("[cx] conversion fired", g.scenario_id, ctx.path);
          // 消費済み（remainingには入れない）
        } else {
          remaining.push(g);
        }
      }
      if (remaining.length !== goals.length) {
        if (remaining.length > 0) {
          sessionStorage.setItem(storageKey, JSON.stringify(remaining));
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (e) {}
  }
  // ────────────────────────────────────────────────────────────────

  // ─── 配信頻度チェック ──────────────────────────────────────────────
  // display.unit: 'pageview' | 'session' | 'user'
  // display.interval: 1(毎回) | 3(3回に1回) | 5(5回に1回)
  function checkAndMarkFrequency(scenarioId, display) {
    if (!display || !display.unit || display.unit === "pageview" && Number(display.interval || 1) <= 1) {
      return true; // デフォルト：制限なし
    }
    var unit = String(display.unit);
    var interval = Math.max(1, Number(display.interval || 1));
    try {
      if (unit === "session") {
        var seKey = "cx_se_" + scenarioId;
        var svKey = "cx_sv_" + scenarioId;
        // このセッションで既に表示済みなら false
        if (sessionStorage.getItem(seKey)) return false;
        // セッション間隔チェック
        var sv = parseInt(localStorage.getItem(svKey) || "0", 10);
        if (sv % interval !== 0) {
          localStorage.setItem(svKey, String(sv + 1));
          return false;
        }
        sessionStorage.setItem(seKey, "1");
        localStorage.setItem(svKey, String(sv + 1));
        return true;
      }
      if (unit === "user") {
        var uvKey = "cx_uv_" + scenarioId;
        var uv = parseInt(localStorage.getItem(uvKey) || "0", 10);
        if (uv >= interval) return false;
        localStorage.setItem(uvKey, String(uv + 1));
        return true;
      }
      // pageview
      var pvKey = "cx_pv_" + scenarioId;
      var pv = parseInt(localStorage.getItem(pvKey) || "0", 10) + 1;
      localStorage.setItem(pvKey, String(pv));
      return ((pv - 1) % interval) === 0;
    } catch (e) {
      return true;
    }
  }
  // ──────────────────────────────────────────────────────────────────

  function shouldRunScenario(s, ctx) {
    if (!s || s.status !== "active") return false;
    var er = s.entry_rules || {};

    // url rule
    if (!shouldRunUrlRule(er, ctx)) return false;

    // 配信頻度チェック
    if (!checkAndMarkFrequency(s.scenario_id || s.id, er.display || null)) return false;

    // 訪問回数チェック
    if (er.visitor && er.visitor.visit_count) {
      var vc = er.visitor.visit_count;
      var vcMin = Number(vc.min_count || 1);
      var vcHours = Number(vc.within_hours || 24);
      var vcUtm = vc.utm_source || "";
      try {
        var vcKey = "cx_visits_" + ctx.site_id;
        var vcVisits = JSON.parse(localStorage.getItem(vcKey) || "[]");
        var vcCutoff = new Date(Date.now() - vcHours * 60 * 60 * 1000).toISOString();
        var vcCount = vcVisits.filter(function(v) {
          if (v.ts < vcCutoff) return false;
          if (vcUtm && v.utm_source !== vcUtm) return false;
          return true;
        }).length;
        if (vcCount < vcMin) return false;
      } catch (e) { return false; }
    }

    // カゴ落ちチェック: 前のセッションでカゴ追加 → 購入せず離脱 → 今回の訪問に配信
    if (er.visitor && er.visitor.cart_abandoned) {
      var cartKey = "cx_cart_" + ctx.site_id;
      var cartActiveKey = "cx_cart_active_" + ctx.site_id;
      try {
        var hasCartFlag = localStorage.getItem(cartKey) === "1";
        var isActiveCartSession = sessionStorage.getItem(cartActiveKey) === "1";
        // localStorage有り（過去にカゴ追加）かつ今セッションではカゴ追加していない → カゴ落ち
        if (!hasCartFlag || isActiveCartSession) return false;
      } catch (e) { return false; }
    }

    // schedule（訪問者のローカル時間で判定）
    var schedule = s.schedule;
    if (schedule) {
      var now = new Date();
      if (schedule.startAt) {
        var start = new Date(schedule.startAt);
        if (now < start) return false;
      }
      if (schedule.endAt) {
        var end = new Date(schedule.endAt);
        if (now > end) return false;
      }
    }

    return true;
  }

  function scheduleScenario(s, ctx, apiBase) {
    var er = s.entry_rules || {};
    var waitMs = Number((er.trigger && er.trigger.ms) || 0);
    if (er.behavior && er.behavior.stay_gte_sec) {
      waitMs = Math.max(waitMs, Number(er.behavior.stay_gte_sec) * 1000);
    }
    var scrollPct = er.behavior && er.behavior.scroll_depth_pct ? Number(er.behavior.scroll_depth_pct) : 0;

    var actions = Array.isArray(s.actions) ? s.actions : [];
    if (!actions.length) {
      log("[cx] no actions in scenario", s.scenario_id);
      return;
    }
    ctx.scenario_id = s.scenario_id || s.id;
    ctx.variant_id = s.variant_id || null;

    // ゴール登録（コンバージョン計測用）
    if (s.goal && s.goal.type && s.goal.value) {
      var firstActionId = actions.length ? (actions[0].action_id || null) : null;
      if (s.goal.attribution === "click") {
        // クリックベース: click_link 発火時に登録するため ctx に保持
        ctx.pending_click_goal = {
          scenarioId: ctx.scenario_id,
          actionId: firstActionId,
          variantId: ctx.variant_id,
          goal: s.goal
        };
      } else {
        // 表示ベース（デフォルト）: 即時登録
        registerGoal(ctx.site_id, ctx.scenario_id, firstActionId, ctx.variant_id, s.goal);
      }
    }

    function fire() {
      runActions(actions, apiBase, ctx);
    }

    // 即時トリガー
    if (er.trigger && er.trigger.type === "immediate") {
      fire();
      return;
    }

    // カートトリガー
    if (er.trigger && er.trigger.type === "cart_add") {
      window.addEventListener("cx:cart:add", function onCartAdd() {
        window.removeEventListener("cx:cart:add", onCartAdd);
        fire();
      });
      return;
    }

    if (scrollPct > 0) {
      // スクロールトリガー: stay_gte_sec 秒の最小待機後にスクロール深度を監視
      var readyToScroll = waitMs <= 0;
      var scrollFired = false;

      function onScroll() {
        if (!readyToScroll || scrollFired) return;
        var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        var docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var pct = docHeight <= 0 ? 100 : (scrollTop / docHeight) * 100;
        if (pct >= scrollPct) {
          scrollFired = true;
          window.removeEventListener("scroll", onScroll);
          fire();
        }
      }

      if (waitMs > 0) {
        setTimeout(function () {
          readyToScroll = true;
          onScroll(); // 既にスクロール済みの場合も即発火
        }, waitMs);
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll(); // 初期チェック（ページが短くてスクロールできない場合など）
    } else {
      // タイマートリガー（既存）
      setTimeout(fire, waitMs);
    }
  }

  function main() {
    var script = getCurrentScript();
    if (!script) return;

    var siteId = script.getAttribute("data-site-id") || "";
    var siteKey = script.getAttribute("data-site-key") || "";
    var apiBase = resolveApiBase(script);
    if (!siteId || !apiBase) {
      log("[cx] missing data-site-id or could not resolve api base");
      return;
    }

    // 管理者除外: URLパラメータ cx_exclude=1/0 でlocalStorageフラグをセット
    try {
      var excludeParam = new URLSearchParams(window.location.search).get("cx_exclude");
      if (excludeParam === "1") {
        localStorage.setItem("cx_no_track", "1");
        log("[cx] admin opt-out ON (cx_exclude=1)");
        // パラメータをURLから除去してリロード（履歴汚染を防ぐ）
        var cleanUrl = window.location.href.replace(/[?&]cx_exclude=1/, "").replace(/\?$/, "").replace(/&$/, "");
        window.history.replaceState(null, "", cleanUrl);
      } else if (excludeParam === "0") {
        localStorage.removeItem("cx_no_track");
        log("[cx] admin opt-out OFF (cx_exclude=0)");
        var cleanUrl2 = window.location.href.replace(/[?&]cx_exclude=0/, "").replace(/\?$/, "").replace(/&$/, "");
        window.history.replaceState(null, "", cleanUrl2);
      }
    } catch (e) {}

    // 管理者除外: localStorage に cx_no_track=1 がセットされている場合はトラッキングをスキップ
    try {
      if (localStorage.getItem("cx_no_track") === "1") {
        log("[cx] tracking disabled (cx_no_track=1) — admin opt-out active");
        return;
      }
    } catch (e) {}

    log("[cx] sdk origin/api", {
      script: script && script.src ? script.src : "",
      apiBase: apiBase
    });

    // UTM パラメータをキャプチャ（セッション中は sessionStorage で保持）
    function getOrStoreUtm() {
      var params = new URLSearchParams(window.location.search);
      var source = params.get("utm_source") || "";
      var medium = params.get("utm_medium") || "";
      var campaign = params.get("utm_campaign") || "";
      var storageKey = "cx_utm_" + siteId;
      if (source || medium || campaign) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ utm_source: source, utm_medium: medium, utm_campaign: campaign }));
        } catch (e) {}
        return { utm_source: source, utm_medium: medium, utm_campaign: campaign };
      }
      try {
        var stored = sessionStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return { utm_source: "", utm_medium: "", utm_campaign: "" };
    }
    var utm = getOrStoreUtm();

    // 新規訪問者判定: cx_vid が存在しない = 初回訪問
    var isNewVisitor = false;
    try { isNewVisitor = !localStorage.getItem("cx_vid"); } catch (e) {}

    // 訪問履歴を記録（訪問回数条件の判定に使用）
    try {
      var visitsKey = "cx_visits_" + siteId;
      var visits = JSON.parse(localStorage.getItem(visitsKey) || "[]");
      visits.push({ ts: new Date().toISOString(), utm_source: utm.utm_source || "" });
      // 7日より古いエントリは削除
      var pruneTs = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      visits = visits.filter(function(v) { return v.ts > pruneTs; });
      localStorage.setItem(visitsKey, JSON.stringify(visits));
    } catch (e) {}

    var ctx = {
      site_id: siteId,
      site_key: siteKey,
      url: window.location.href,
      path: window.location.pathname,
      ref: document.referrer || "",
      page_type: script.getAttribute("data-page-type") || pageTypeFromPath(window.location.pathname),
      vid: getOrCreateId("cx_vid"),  // ← この呼び出しで cx_vid が新規作成される
      sid: getOrCreateSessionId("cx_sid_" + siteId),  // sessionStorage: タブ/ブラウザ終了でリセット
      variant_id: null
    };

    // コンバージョン計測: 前ページのシナリオゴールと現在のURLを照合してCV送信
    checkPendingConversions(apiBase, ctx);

    // Shopify カート属性に cx_vid を同期（チェックアウトドメインが異なる場合でも Web Pixel から取得できるよう）
    try {
      fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: { _cx_vid: ctx.vid, _cx_sid: ctx.sid } }),
        credentials: "same-origin"
      }).catch(function () {});
    } catch (e) {}

    // カゴ落ち追跡: cx:cart:add イベントでフラグをセット
    var cartKey = "cx_cart_" + siteId;
    var cartActiveKey = "cx_cart_active_" + siteId;
    window.addEventListener("cx:cart:add", function () {
      try {
        localStorage.setItem(cartKey, "1");
        sessionStorage.setItem(cartActiveKey, "1"); // 今セッションでのカゴ追加フラグ
      } catch (e) {}
    });

    // 購入完了でカゴ落ちフラグをクリア
    function clearCartFlag() {
      try { localStorage.removeItem(cartKey); } catch (e) {}
    }
    window.addEventListener("cx:purchase", clearCartFlag);
    // サンキューページのURLパターンでも自動クリア
    var path = window.location.pathname.toLowerCase();
    if (/\/(thank|thanks|order[-_]?confirm|checkout\/thank|orders\/[a-z0-9]+\/thank)/.test(path)) {
      clearCartFlag();
    }

    // pageview ログを送信
    postLog(apiBase, {
      site_id: siteId,
      event: "pageview",
      url: window.location.href,
      path: window.location.pathname,
      ref: document.referrer || "",
      vid: ctx.vid,
      sid: ctx.sid,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      is_new: isNewVisitor,
    }, siteId, siteKey);

    // 滞在時間・離脱計測
    var pageEnterTime = Date.now();
    var pageLeaveSent = false;
    function sendPageLeave() {
      if (pageLeaveSent) return;
      pageLeaveSent = true;
      var duration = Math.round((Date.now() - pageEnterTime) / 1000);
      var payload = JSON.stringify({
        site_id: siteId,
        event: "pageleave",
        url: window.location.href,
        path: window.location.pathname,
        vid: ctx.vid,
        sid: ctx.sid,
        duration_sec: duration,
      });
      // navigator.sendBeacon はページ離脱時でも確実に送れる
      var logUrl = apiBase.replace("/serve", "/log");
      var sent = false;
      try {
        if (navigator.sendBeacon) {
          sent = navigator.sendBeacon(logUrl, new Blob([payload], { type: "application/json" }));
        }
      } catch (e) {}
      if (!sent) {
        // sendBeacon が使えない場合は fetch (keepalive)
        try {
          fetch(logUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Site-Id": siteId, "X-Site-Key": siteKey },
            body: payload,
            keepalive: true,
          });
        } catch (e) {}
      }
    }
    window.addEventListener("beforeunload", sendPageLeave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sendPageLeave();
    });

    var cacheKey = "cx_serve_" + siteId + "_" + window.location.pathname;
    var CACHE_TTL = 5 * 60 * 1000;

    function runScenarios(scenarios) {
      if (!Array.isArray(scenarios) || !scenarios.length) return;
      warmupImages(scenarios);
      scenarios.sort(function (a, b) { return Number((b.priority || 0)) - Number((a.priority || 0)); });
      for (var i = 0; i < scenarios.length; i++) {
        if (!shouldRunScenario(scenarios[i], ctx)) continue;
        scheduleScenario(scenarios[i], ctx, apiBase);
        break;
      }
    }

    // キャッシュから即時実行
    var ranFromCache = false;
    try {
      var raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL)) {
          log("[cx] serve cache hit", window.location.pathname);
          runScenarios(cached.scenarios);
          ranFromCache = true;
        }
      }
    } catch (e) {}

    // バックグラウンドでAPIを叩いてキャッシュを更新
    fetch(apiBase + (apiBase.indexOf("?") >= 0 ? "&" : "?") + qs(ctx), {
      headers: {
        "X-Site-Id": siteId,
        "X-Site-Key": siteKey
      }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var scenarios = (data && data.scenarios) || [];
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), scenarios: scenarios }));
        } catch (e) {}
        if (!ranFromCache) {
          runScenarios(scenarios);
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