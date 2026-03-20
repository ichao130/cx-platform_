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

  function postLog(apiBase, payload, siteId, siteKey) {
    var url = logEndpointFromServe(apiBase);
    if (!url) return;
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
      cta_url_text: creative.cta_url_text || creative.link_text || creative.linkText || "詳細を見る"
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
      ":host{display:contents;font-family:var(--cx-font, system-ui);color:var(--cx-text,#111);}"+
      ".cx-scope{all:initial;font-family:var(--cx-font, system-ui);color:var(--cx-text,#111);}"+
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

  function renderWithTemplate(action, next, apiBase, ctx, mount) {
    var tpl = action.template;
    if (!tpl || (!tpl.html && !tpl.css)) return false;

    var templateId = action.templateId || action.template_id || (tpl && tpl.template_id) || "";

    // mount
    var hostHandle = null;
    var rootForInsert = document.body;

    if (mount && mount.selector && (action.type || "modal") !== "modal") {
      var target = null;
      try { target = document.querySelector(mount.selector); } catch (e) { target = null; }
      if (!target) {
        log("[cx] mount target not found:", mount.selector);
        return false; // do not show
      }

      var host = createMountHost(target, mount, templateId);
      hostHandle = mountRootFor(host, mount);
      rootForInsert = hostHandle.root || host;
      ensureTemplateStyle(templateId, tpl.css, hostHandle.shadowRoot || null);
    } else {
      // modal/banner/toast -> global
      ensureTemplateStyle(templateId, tpl.css, null);
    }

    var creative = normalizeCreative(action.creative);
    var html = renderTemplate(tpl.html, creative);

    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    var root = wrapper.firstElementChild;
    if (!root) return false;

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
        });
      }
    }

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

    return true;
  }

  function renderModal(action, next, apiBase, ctx) {
    // modalは常にoverlay（DOM差し込み対象外）
    ensureBaseStyle();

    // template優先（global）
    if (renderWithTemplate(action, next, apiBase, ctx, null)) return;

    var creative = normalizeCreative(action.creative);

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
  }

  function renderBanner(action, next, apiBase, ctx) {
    ensureBaseStyle();
    var mount = pickMount(action);
    if (renderWithTemplate(action, next, apiBase, ctx, mount)) return;

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
        });
      }
    }
  }

  function renderToast(action, next, apiBase, ctx) {
    ensureBaseStyle();
    var mount = pickMount(action);
    if (renderWithTemplate(action, next, apiBase, ctx, mount)) return;

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
    var toast2 = document.createElement("div");
    toast2.className = "cx-toast";
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

    var timer2 = setTimeout(function () {
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
    }, 5000);

    toast2.addEventListener("click", function () {
      clearTimeout(timer2);
      try { toast2.remove(); } catch (e) {}
      postLog(apiBase, {
        site_id: ctx.site_id,
        scenario_id: ctx.scenario_id,
        action_id: action.action_id || action.id,
        template_id: action.template_id || null,
        variant_id: ctx.variant_id || null,
        event: "click",
        url: ctx.url, path: ctx.path, ref: ctx.ref, vid: ctx.vid, sid: ctx.sid
      }, ctx.site_id, ctx.site_key);

      if (creative2.cta_url) {
        try { window.open(creative2.cta_url, "_blank"); } catch (e) {}
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
    if (mode === "starts_with") return a.indexOf(e) === 0;
    if (mode === "regex") {
      try { return new RegExp(expected).test(actual); } catch (e2) { return false; }
    }
    // unknown mode -> contains
    return a.indexOf(e) !== -1;
  }

  function shouldRunUrlRule(er, ctx) {
    var rule = er && er.page && er.page.url ? er.page.url : null;
    if (!rule) return true;

    var target = String(rule.target || "url"); // url|path|ref
    var mode = rule.mode || "contains";
    var value = rule.value || "";

    var actual = "";
    if (target === "path") actual = ctx.path || "";
    else if (target === "ref") actual = ctx.ref || "";
    else actual = ctx.url || "";

    return matchStringRule(actual, mode, value);
  }


  function shouldRunScenario(s, ctx) {
    if (!s || s.status !== "active") return false;
    var er = s.entry_rules || {};

    // page_type_in
    var allowed = er.page && Array.isArray(er.page.page_type_in) ? er.page.page_type_in : null;
    if (allowed && allowed.length) {
      if (allowed.indexOf(ctx.page_type) === -1) return false;
    }

    // url rule（追加）
    if (!shouldRunUrlRule(er, ctx)) return false;

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
      ctx.variant_id = s.variant_id || null; // serverが付与
      runActions(actions, apiBase, ctx);
    }, waitMs);
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

    log("[cx] sdk origin/api", {
      script: script && script.src ? script.src : "",
      apiBase: apiBase
    });

    var ctx = {
      site_id: siteId,
      site_key: siteKey,
      url: window.location.href,
      path: window.location.pathname,
      ref: document.referrer || "",
      page_type: script.getAttribute("data-page-type") || pageTypeFromPath(window.location.pathname),
      vid: getOrCreateId("cx_vid"),
      sid: getOrCreateId("cx_sid_" + siteId),
      variant_id: null
    };

    fetch(apiBase + (apiBase.indexOf("?") >= 0 ? "&" : "?") + qs(ctx), {
      headers: {
        "X-Site-Id": siteId,
        "X-Site-Key": siteKey
      }
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