/* Renders window.CONTENT. No dependencies, no build step. */
(function () {
  "use strict";
  var C = window.CONTENT;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var state = { lens: "all", era: null, node: null, userNode: false };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }
  var EV_LABEL = { resume: "Résumé-sourced", reported: "Self-reported", documented: "Documented", progress: "In progress" };
  function ev(e) {
    if (!e) return null;
    var s = el("span", { class: "ev", "data-s": e.status });
    s.appendChild(el("b", { text: e.id + " · " + EV_LABEL[e.status] }));
    s.appendChild(el("span", { text: e.note || "" }));
    return s;
  }
  function hit(item) { return state.lens === "all" || (item.lenses || []).indexOf(state.lens) > -1; }

  /* ---------- Hero ---------- */
  function renderHero(animate) {
    var h = C.hero[state.lens];
    $("heroHeadline").innerHTML = h.headline;
    $("heroSub").textContent = h.sub;
    if (animate) {
      var hc = document.querySelector(".hero-copy");
      hc.classList.remove("swap"); void hc.offsetWidth; hc.classList.add("swap");
    }
    if (!state.userNode) setNode(h.node);
  }

  /* ---------- Seam diagram ---------- */
  var nodeEls = {}, spokeEls = {};
  function buildSeam() {
    var s = $("seamSvg"), cx = 220, cy = 200, R = 150, nodes = C.seams.nodes;
    // Narrow screens: widen the viewBox so the outer labels stay inside the screen.
    var mq = matchMedia("(max-width: 600px)");
    var fit = function () { s.setAttribute("viewBox", mq.matches ? "-70 0 580 400" : "0 0 440 400"); };
    fit(); mq.addEventListener ? mq.addEventListener("change", fit) : mq.addListener(fit);
    s.appendChild(svg("circle", { class: "ring", cx: cx, cy: cy, r: R }));
    s.appendChild(svg("circle", { class: "ring", cx: cx, cy: cy, r: 86 }));
    nodes.forEach(function (n, i) {
      var a = (-90 + i * (360 / nodes.length)) * Math.PI / 180;
      var x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      var line = svg("line", { class: "spoke", x1: cx, y1: cy, x2: x, y2: y });
      s.appendChild(line); spokeEls[n.key] = line;
      if (!reduce) {
        var p = svg("circle", { class: "pulse", r: 2.6 });
        var out = i % 2 === 0;
        var m = svg("animateMotion", {
          dur: (3.2 + i * 0.45) + "s", repeatCount: "indefinite", begin: (i * 0.6) + "s",
          path: out ? "M" + cx + "," + cy + " L" + x + "," + y : "M" + x + "," + y + " L" + cx + "," + cy
        });
        p.appendChild(m); s.appendChild(p);
      }
    });
    nodes.forEach(function (n, i) {
      var a = (-90 + i * (360 / nodes.length)) * Math.PI / 180;
      var x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      var g = svg("g", { class: "node", tabindex: "0", role: "button", "aria-label": n.title });
      g.appendChild(svg("circle", { cx: x, cy: y, r: 16, fill: "transparent", stroke: "none", style: "fill:transparent;stroke:none" }));
      g.appendChild(svg("circle", { cx: x, cy: y, r: 6.5 }));
      var cos = Math.cos(a), sin = Math.sin(a);
      var t = svg("text", {
        x: x + cos * 18, y: y + sin * 22 + 4,
        "text-anchor": Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end"
      });
      t.textContent = n.label; g.appendChild(t);
      var pick = function () { state.userNode = true; setNode(n.key); };
      g.addEventListener("mouseenter", pick);
      g.addEventListener("focus", pick);
      g.addEventListener("click", pick);
      s.appendChild(g); nodeEls[n.key] = g;
    });
    s.appendChild(svg("circle", { class: "core", cx: cx, cy: cy, r: 42 }));
    var ct = svg("text", { class: "core-t", x: cx, y: cy + 4 }); ct.textContent = "Program"; s.appendChild(ct);
    if (!reduce) {
      setInterval(function () {
        if (state.userNode || document.hidden) return;
        var keys = nodes.map(function (n) { return n.key; });
        setNode(keys[(keys.indexOf(state.node) + 1) % keys.length]);
      }, 4200);
    }
  }
  function setNode(key) {
    state.node = key;
    C.seams.nodes.forEach(function (n) {
      var on = n.key === key;
      nodeEls[n.key] && nodeEls[n.key].classList.toggle("on", on);
      spokeEls[n.key] && spokeEls[n.key].classList.toggle("on", on);
      if (on) { $("seamCaption").innerHTML = ""; $("seamCaption").appendChild(el("b", { text: n.title })); $("seamCaption").appendChild(document.createTextNode(n.text)); }
    });
  }

  /* ---------- Lens ---------- */
  function buildLens() {
    C.lenses.forEach(function (l) {
      var b = el("button", { type: "button", "aria-pressed": String(l.key === state.lens), text: l.label });
      b.addEventListener("click", function () { setLens(l.key, true); });
      b.dataset.key = l.key;
      $("lensOpts").appendChild(b);
    });
  }
  function setLens(key, animate) {
    if (!C.hero[key]) key = "all";
    state.lens = key; state.userNode = false;
    [].forEach.call($("lensOpts").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.key === key)); });
    renderHero(animate); applyLens(); Gloss.annotate();
    try { history.replaceState(null, "", key === "all" ? location.pathname + location.search : "#" + key); } catch (e) {}
  }
  function applyLens() {
    document.querySelectorAll("[data-lenses]").forEach(function (n) {
      var ls = n.dataset.lenses.split(",");
      var on = state.lens === "all" || ls.indexOf(state.lens) > -1;
      n.classList.toggle("dim", !on);
      n.classList.toggle("hit", on && state.lens !== "all" && n.classList.contains("cap"));
    });
    // Reorder cases: matches first, original order otherwise.
    var wrap = $("cases");
    C.cases.slice().sort(function (a, b) { return (hit(b) ? 1 : 0) - (hit(a) ? 1 : 0); })
      .forEach(function (c) { wrap.appendChild(document.getElementById("case-" + c.id)); });
  }

  /* ---------- Stats ---------- */
  function buildStats() {
    C.stats.forEach(function (s) {
      var num = el("div", { class: "stat-num", text: s.prefix + s.value + s.suffix });
      num.dataset.v = s.value; num.dataset.p = s.prefix; num.dataset.s = s.suffix;
      var d = el("div", { class: "stat reveal", "data-lenses": s.lenses.join(",") }, [num, el("div", { class: "stat-label", text: s.label }), ev(s.ev)]);
      $("stats").appendChild(d);
    });
  }
  function countUp(n) {
    if (reduce) return;
    var v = +n.dataset.v, t0 = performance.now(), dur = 1100;
    (function tick(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      n.textContent = n.dataset.p + Math.round(v * e) + n.dataset.s;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- Capabilities ---------- */
  function buildCaps() {
    $("seamIntro").textContent = C.seams.intro;
    C.capabilities.forEach(function (c) {
      $("caps").appendChild(el("article", { class: "cap", "data-lenses": c.lenses.join(",") }, [
        el("span", { class: "cap-n", text: c.n }), el("h3", { text: c.title }),
        el("p", { text: c.text }), el("span", { class: "cap-tools", text: c.tools })
      ]));
    });
  }

  /* ---------- Cases ---------- */
  function buildCases() {
    C.cases.forEach(function (c) {
      var b = el("button", { type: "button", class: "case reveal", id: "case-" + c.id, "data-lenses": c.lenses.join(","), "aria-haspopup": "dialog" }, [
        el("div", { class: "case-top" }, [
          el("span", { class: "case-org", text: c.org + " · " + c.period }),
          el("span", { class: "status", "data-s": c.status, text: c.status })
        ]),
        el("h3", { text: c.title }), el("p", { text: c.line }),
        el("div", { class: "tags" }, c.tags.map(function (t) { return el("span", { class: "tag", text: t }); })),
        el("span", { class: "case-more", text: "Read the case →" }), ev(c.ev)
      ]);
      b.addEventListener("click", function () { openCase(c); });
      $("cases").appendChild(b);
    });
  }
  function openCase(c) {
    var body = $("dlgBody"); body.innerHTML = "";
    var dl = el("dl", { class: "dlg-grid" });
    function add(t, node) { dl.appendChild(el("dt", { text: t })); dl.appendChild(node); }
    add("Context", el("dd", { text: c.context }));
    add("My role", el("dd", { text: c.role }));
    add("Approach", el("dd", {}, [el("ul", {}, c.approach.map(function (a) { return el("li", { text: a }); }))]));
    add(c.status === "Delivered" ? "Result" : "Status", el("dd", { class: "out", text: c.outcome }));
    [el("div", { class: "dlg-meta" }, [
        el("span", { class: "case-org", text: c.org + " · " + c.period }),
        el("span", { class: "status", "data-s": c.status, text: c.status })]),
      el("h3", { id: "dlgTitle", text: c.title }), dl,
      el("div", { class: "tags dlg-tags", role: "list", "aria-label": "Focus areas" }, c.tags.map(function (t) { return el("span", { class: "tag", role: "listitem", text: t }); })), ev(c.ev)
    ].forEach(function (n) { n && body.appendChild(n); });
    Gloss.scanContext(body);
    var d = $("caseDialog");
    d.showModal ? d.showModal() : d.setAttribute("open", "");
    d.scrollTop = 0;
  }

  /* ---------- Principles ---------- */
  function buildPrinciples() {
    C.principles.forEach(function (p) {
      $("principlesList").appendChild(el("li", { class: "reveal" }, [el("h3", { text: p.title }), el("p", { text: p.text })]));
    });
  }

  /* ---------- On AI (two parts) ---------- */
  function buildInquiry() {
    var Q = C.inquiry;
    $("inquiryIntro").textContent = Q.intro;
    var e = ev(Q.ev); e && $("inquiryIntro").parentNode.appendChild(e);
    var p1 = Q.partI || { notes: Q.notes || [] };
    if (p1.title) { $("aiP1Label").textContent = p1.label; $("aiP1Title").textContent = p1.title; }
    $("aiP1Intro").textContent = p1.intro || "";
    p1.notes.forEach(function (n, i) {
      var num = n.n || i + 1;
      $("inquiryList").appendChild(el("article", { class: "note reveal", id: "ai-note-" + num }, [
        el("span", { class: "note-n", text: (num < 10 ? "0" : "") + num }), el("h4", { text: n.q }), el("p", { text: n.a }), ev(n.ev)]));
    });
    var p2 = Q.partII;
    if (!p2) { $("aiPart2").hidden = true; return; }
    $("aiP2Label").textContent = p2.label; $("aiP2Title").textContent = p2.title; $("aiP2Intro").textContent = p2.intro || "";
    var e2 = ev(p2.ev); e2 && $("aiP2Head").appendChild(e2);
    p2.items.forEach(function (it, i) {
      var body = el("div", { class: "persp-body", id: "ai-" + it.id + "-more" });
      it.body.forEach(function (t) { body.appendChild(el("p", { text: t })); });
      if (it.practice) body.appendChild(el("p", { class: "persp-practice" }, [el("b", { text: "In my work" }), document.createTextNode(it.practice)]));
      if (it.reading && it.reading.length) {
        body.appendChild(el("div", { class: "persp-reading" }, [el("b", { text: "Further reading" }),
          el("ul", {}, it.reading.map(function (r) { return el("li", {}, [el("a", { href: r.url, target: "_blank", rel: "noopener", text: r.label })]); }))]));
      }
      var det = el("details", {}, [
        el("summary", {}, [el("span", { class: "s-open", text: "Read the argument" }), el("span", { class: "s-close", text: "Close" })]),
        body
      ]);
      $("perspList").appendChild(el("article", { class: "persp reveal", id: "ai-" + it.id }, [
        el("span", { class: "persp-n", text: (i < 9 ? "0" : "") + (i + 1) }),
        el("div", {}, [
          (it.from && it.from.length) ? el("p", { class: "persp-from" }, [document.createTextNode("Builds on Part I · ")].concat(it.from.map(function (f, k) {
            var a = el("a", { href: "#ai-note-" + f, text: (f < 10 ? "0" : "") + f });
            return k ? [document.createTextNode(", "), a] : [a];
          }).reduce(function (x, y) { return x.concat(y); }, []))) : null,
          el("h4", { text: it.title }), el("p", { class: "persp-core", text: it.core }), det])
      ]));
    });
  }

  /* ---------- Career ---------- */
  function buildCareer() {
    C.eras.slice().reverse().forEach(function (e) {
      var b = el("button", { type: "button", "aria-pressed": "false", style: "flex:" + (e.to - e.from).toFixed(1) }, [
        el("span", { text: Math.floor(e.from) + " – " + (e.to > 2026 ? "now" : Math.floor(e.to)) }), el("b", { text: e.label })
      ]);
      b.addEventListener("click", function () {
        state.era = state.era === e.key ? null : e.key;
        [].forEach.call($("eraBar").children, function (x) { x.setAttribute("aria-pressed", String(x === b && !!state.era)); });
        document.querySelectorAll(".row").forEach(function (r) { r.classList.toggle("dim", !!state.era && r.dataset.era !== state.era); });
      });
      $("eraBar").appendChild(b);
    });
    C.timeline.forEach(function (t) {
      $("timeline").appendChild(el("div", { class: "row reveal", "data-era": t.era }, [
        el("div", { class: "years", text: t.years }),
        el("div", {}, [el("h3", { text: t.org }), el("div", { class: "role", text: t.role })]),
        el("div", {}, [el("p", { class: "desc", text: t.text }), ev(t.ev)])
      ]));
    });
    var edu = $("edu");
    edu.appendChild(el("b", { text: "Education and training. " }));
    edu.appendChild(document.createTextNode(C.education.text + " "));
    var e = ev(C.education.ev); e && edu.appendChild(e);
  }

  /* ---------- Résumé / contact ---------- */
  function buildResume() {
    var p = C.person;
    ["resumeBtn", "resumeBtnTop"].forEach(function (id) { $(id).href = p.resumePdf; $(id).setAttribute("download", ""); });
    $("resumeView").href = p.resumePdf;
    var c = $("contact"), parts = [];
    if (p.email) parts.push('<a href="mailto:' + p.email + '">' + p.email + "</a>");
    if (p.linkedin) parts.push('<a href="' + p.linkedin + '" target="_blank" rel="noopener">LinkedIn</a>');
    c.innerHTML = parts.length ? parts.join(" · ") : "Based in " + p.location + ".";
    if (!parts.length) ;
  }

  /* ---------- Review mode ---------- */
  function setReview(on) {
    return;
    document.body.classList.toggle("review", on);
    $("reviewBar").hidden = !on;
    var open = document.querySelectorAll('#main .ev:not([data-s="documented"])').length;
    $("reviewCount").textContent = "";
    try { sessionStorage.setItem("mj-review", on ? "1" : ""); } catch (e) {}
  }

  /* ---------- Glossary ----------
     Page rule: each term is explained once, at its first appearance in reading order.
       Pass 1 walks the always-visible page (#main) top to bottom; pass 2 walks the expandable
       Part II arguments, explaining only terms not already explained above them.
     Separate contexts: each case dialog explains a term once within that dialog.
     Never inside links, buttons (case cards, lens and era controls) or summaries; the rotating
     diagram caption is skipped. Lens changes rebuild the annotations from scratch.
     Definitions live only in content.js -> glossary. */
  var Gloss = (function () {
    var list = C.glossary || [], byKey = {};
    if (!list.length) return { annotate: function () {}, scanContext: function () {}, hide: function () {} };
    var order = list.slice().sort(function (a, b) { return b.match.length - a.match.length; });
    order.forEach(function (g) { byKey[g.key] = g; });
    var re = new RegExp("(^|[^A-Za-z0-9])(?:" + order.map(function (g) { return "(" + g.match.replace(/\((?!\?)/g, "(?:") + ")"; }).join("|") + ")(?![A-Za-z0-9])", "g");
    var defs = el("div", { id: "glossDefs", hidden: "" });
    list.forEach(function (g) { defs.appendChild(el("span", { id: "gl-" + g.key, text: g.full + ". " + g.plain + " Example: " + g.example })); });
    document.body.appendChild(defs);

    var pop = el("div", { class: "gloss-pop", id: "glossPop", role: "dialog", "aria-modal": "false", "aria-labelledby": "glossPopFull", hidden: "" });
    var x = el("button", { type: "button", class: "gp-x", "aria-label": "Close definition", text: "×" });
    var pTerm = el("p", { class: "gp-term" }), pFull = el("p", { class: "gp-full", id: "glossPopFull" }), pPlain = el("p", { class: "gp-plain" }), pEx = el("p", { class: "gp-ex" });
    [x, pTerm, pFull, pPlain, pEx].forEach(function (n) { pop.appendChild(n); });
    document.body.appendChild(pop);
    var cur = null, pinned = false, tShow, tHide;

    function place() {
      if (!cur) return;
      var r = cur.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 10;
      pop.style.maxWidth = Math.min(340, vw - 2 * m) + "px";
      var w = pop.offsetWidth, hgt = pop.offsetHeight;
      var left = Math.max(m, Math.min(r.left + r.width / 2 - w / 2, vw - w - m));
      var top = r.bottom + 8, above = top + hgt > vh - m && r.top - hgt - 8 > m;
      if (above) top = r.top - hgt - 8;
      top = Math.max(m, Math.min(top, vh - hgt - m));
      pop.style.left = Math.round(left) + "px"; pop.style.top = Math.round(top) + "px";
      pop.dataset.side = above ? "above" : "below";
    }
    function show(t, pin) {
      clearTimeout(tShow); clearTimeout(tHide);
      var g = byKey[t.dataset.key]; if (!g) return;
      if (cur && cur !== t) cur.setAttribute("aria-expanded", "false");
      cur = t; pinned = !!pin;
      pTerm.textContent = g.term; pFull.textContent = g.full; pPlain.textContent = g.plain;
      pEx.innerHTML = ""; pEx.appendChild(el("span", { text: "Example" })); pEx.appendChild(document.createTextNode(g.example));
      var host = t.closest("dialog") || document.body;
      if (pop.parentNode !== host) host.appendChild(pop);
      pop.hidden = false; t.setAttribute("aria-expanded", "true"); place();
    }
    function hide(refocus) {
      clearTimeout(tShow); clearTimeout(tHide);
      if (!cur) return;
      var t = cur; cur = null; pinned = false; pop.hidden = true;
      t.setAttribute("aria-expanded", "false");
      if (refocus && t.isConnected) t.focus();
    }
    function mouse(e) { return e.pointerType === "mouse" || e.pointerType === "pen"; }
    function wire(b) {
      b.addEventListener("pointerenter", function (e) { if (!mouse(e) || pinned) return; clearTimeout(tHide); tShow = setTimeout(function () { show(b, false); }, 90); });
      b.addEventListener("pointerleave", function (e) { if (!mouse(e)) return; clearTimeout(tShow); if (!pinned) tHide = setTimeout(hide, 180); });
      b.addEventListener("focus", function () { if (!pinned && b.matches(":focus-visible")) show(b, false); });
      b.addEventListener("blur", function (e) { if (!pop.contains(e.relatedTarget) && (e.relatedTarget || !pinned)) tHide = setTimeout(hide, 120); });
      b.addEventListener("click", function (e) { e.stopPropagation(); if (cur === b && pinned) hide(); else show(b, true); });
    }
    pop.addEventListener("pointerenter", function () { clearTimeout(tHide); });
    pop.addEventListener("pointerleave", function (e) { if (mouse(e) && !pinned) tHide = setTimeout(hide, 180); });
    x.addEventListener("click", function () { hide(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && cur) { e.preventDefault(); e.stopPropagation(); hide(true); } }, true);
    document.addEventListener("pointerdown", function (e) { if (cur && !pop.contains(e.target) && !e.target.closest(".term")) hide(); }, true);
    var raf = 0; function later() { if (cur && !raf) raf = requestAnimationFrame(function () { raf = 0; place(); }); }
    window.addEventListener("scroll", later, true); window.addEventListener("resize", later);

    var SKIP = "a,button,summary,label,script,style,svg,.ev,.term,.gloss-pop,#glossDefs,#seamCaption";
    function eligible(root, excludeBodies) {
      var nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || !n.nodeValue.trim() || p.closest(SKIP)) return 2;
        if (excludeBodies && p.closest(".persp-body")) return 2;
        return 1;
      } });
      while (w.nextNode()) nodes.push(w.currentNode);
      return nodes;
    }
    function wrap(nodes, seen) {
      nodes.forEach(function (n) {
        var s = n.nodeValue, out = document.createDocumentFragment(), last = 0, m, hit = false;
        re.lastIndex = 0;
        while ((m = re.exec(s))) {
          var gi = 2; while (gi < m.length && m[gi] === undefined) gi++;
          var key = order[gi - 2].key;
          if (seen[key]) continue;
          seen[key] = true; hit = true;
          var start = m.index + m[1].length;
          out.appendChild(document.createTextNode(s.slice(last, start)));
          var b = el("button", { type: "button", class: "term", "data-key": key, "aria-describedby": "gl-" + key, "aria-expanded": "false", "aria-controls": "glossPop", text: m[gi] });
          wire(b); out.appendChild(b);
          last = start + m[gi].length;
        }
        if (!hit) return;
        out.appendChild(document.createTextNode(s.slice(last)));
        n.parentNode.replaceChild(out, n);
      });
    }
    function unwrap(root) {
      [].slice.call(root.querySelectorAll(".term")).forEach(function (b) { b.parentNode.replaceChild(document.createTextNode(b.textContent), b); });
      root.normalize();
    }
    function annotate() {
      var main = $("main"); if (!main) return;
      if (cur && main.contains(cur)) hide();
      unwrap(main);
      var seen = {};
      wrap(eligible(main, true), seen);
      [].forEach.call(main.querySelectorAll(".persp-body"), function (b) { wrap(eligible(b, false), seen); });
    }
    function scanContext(root) { if (root) { unwrap(root); wrap(eligible(root, false), {}); } }
    var dlg = document.getElementById("caseDialog");
    if (dlg) {
      dlg.addEventListener("close", function () { hide(); });
      dlg.addEventListener("cancel", function (e) { if (cur) { e.preventDefault(); hide(true); } });
    }
    return { annotate: annotate, scanContext: scanContext, hide: hide };
  })();
  /* Glossary list: an unobtrusive footer control for readers who arrive mid-page. */
  function buildGlossaryList() {
    var d = $("glossDialog"), open = $("glossOpen"), dl = $("glossDlgList");
    if (!d || !open || !(C.glossary || []).length) { if (open) open.hidden = true; return; }
    C.glossary.slice().sort(function (a, b) { return a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1; }).forEach(function (g) {
      dl.appendChild(el("dt", {}, [el("b", { text: g.term }), el("span", { text: g.full })]));
      dl.appendChild(el("dd", {}, [el("p", { text: g.plain }), el("p", { class: "gl-ex" }, [el("span", { text: "Example" }), document.createTextNode(g.example)])]));
    });
    open.addEventListener("click", function () { d.showModal ? d.showModal() : d.setAttribute("open", ""); d.scrollTop = 0; });
    d.addEventListener("click", function (e) { if (e.target === this) this.close(); });
  }

  /* ---------- Init ---------- */
  $("heroTitle").textContent = C.person.title;
  $("heroLoc").textContent = C.person.location;
  $("yr").textContent = new Date().getFullYear();
  buildSeam(); buildLens(); buildStats(); buildCaps(); buildCases(); buildPrinciples(); buildInquiry(); buildCareer(); buildResume(); buildGlossaryList();
  var initial = (location.hash || "").slice(1);
  setLens(C.hero[initial] ? initial : "all", false);

  $("themeBtn").addEventListener("click", function () {
    var t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("mj-theme", t); } catch (e) {}
  });
  /* ---------- Mobile menu ---------- */
  (function () {
    var btn = $("menuBtn"), top = document.querySelector(".top"), nav = $("siteNav");
    if (!btn || !nav) return;
    function set(open) {
      top.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    btn.addEventListener("click", function () { set(!top.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && top.classList.contains("open")) { set(false); btn.focus(); } });
    document.addEventListener("click", function (e) { if (top.classList.contains("open") && !top.contains(e.target)) set(false); });
  })();
  $("reviewOn").addEventListener("click", function () { setReview(!document.body.classList.contains("review")); });
  $("reviewOff").addEventListener("click", function () { setReview(false); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea/i.test(e.target.tagName)) {
      setReview(!document.body.classList.contains("review"));
    }
  });
  $("caseDialog").addEventListener("click", function (e) { if (e.target === this) this.close(); });
  var wantReview = /[?&]review=1/.test(location.search);
  try { wantReview = wantReview || sessionStorage.getItem("mj-review") === "1"; } catch (e) {}
  if (wantReview) setReview(true);

  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.classList.add("in");
        var n = x.target.querySelector(".stat-num"); if (n) countUp(n);
        io.unobserve(x.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (n, i) { n.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(n); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
  }
})();
