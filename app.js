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
    renderHero(animate); applyLens();
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
      el("h3", { id: "dlgTitle", text: c.title }), dl, ev(c.ev)
    ].forEach(function (n) { n && body.appendChild(n); });
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

  /* ---------- Inquiry ---------- */
  function buildInquiry() {
    $("inquiryIntro").textContent = C.inquiry.intro;
    var e = ev(C.inquiry.ev); e && $("inquiryIntro").parentNode.appendChild(e);
    C.inquiry.notes.forEach(function (n) {
      $("inquiryList").appendChild(el("article", { class: "note reveal" }, [el("h3", { text: n.q }), el("p", { text: n.a })]));
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

  /* ---------- Init ---------- */
  $("heroTitle").textContent = C.person.title;
  $("heroLoc").textContent = C.person.location;
  $("yr").textContent = new Date().getFullYear();
  buildSeam(); buildLens(); buildStats(); buildCaps(); buildCases(); buildPrinciples(); buildInquiry(); buildCareer(); buildResume();
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
