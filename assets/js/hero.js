/* Cinematische hero: één WebGL-fragment-shader.
   - korrelige hemel (domein-vervormde value noise)
   - gouden kalligrafische lichtdeeltjes die langzaam drijven
   - parallax op pointer en scroll, met diepte per deeltje
   - geen externe afhankelijkheden, DPR begrensd, pauzeert buiten beeld en op een verborgen tab
   - prefers-reduced-motion: shader start niet, de foto-terugval blijft staan
   - geen WebGL of een shaderfout: de foto-terugval blijft staan */

(function () {
  "use strict";

  var canvas = document.querySelector("[data-hero-canvas]");
  if (!canvas) return;

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  var VERT = [
    "attribute vec2 aPos;",
    "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform vec2 uPointer;",
    "uniform float uScroll;",
    "uniform float uIntro;",

    "float hash21(vec2 p){",
    "  p = fract(p * vec2(123.34, 456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",

    "float vnoise(vec2 p){",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float a = hash21(i);",
    "  float b = hash21(i + vec2(1.0, 0.0));",
    "  float c = hash21(i + vec2(0.0, 1.0));",
    "  float d = hash21(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",

    "float fbm(vec2 p){",
    "  float s = 0.0;",
    "  float amp = 0.5;",
    "  for (int i = 0; i < 4; i++) {",
    "    s += amp * vnoise(p);",
    "    p = p * 2.03 + 11.7;",
    "    amp *= 0.5;",
    "  }",
    "  return s;",
    "}",

    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;",
    "  p.y += uScroll * 0.16;",

    // hemelgradiënt
    "  vec3 ink = vec3(0.020, 0.032, 0.028);",
    "  vec3 moss = vec3(0.055, 0.125, 0.100);",
    "  vec3 sky = mix(moss, ink, pow(clamp(uv.y, 0.0, 1.0), 0.85));",

    // warme gloed boven het midden
    "  float halo = length((uv - vec2(0.5, 1.02)) * vec2(1.15, 1.0));",
    "  sky += vec3(0.34, 0.235, 0.085) * smoothstep(0.95, 0.02, halo) * 0.62;",

    // korrelige, langzaam wentelende wolk
    "  vec2 q = p * 1.25 + vec2(0.0, uTime * 0.005);",
    "  float warp = fbm(q * 0.75 + 3.1) * 0.9;",
    "  float cloud = fbm(q + warp + vec2(uPointer.x * 0.05, uPointer.y * 0.04));",
    "  sky += vec3(0.115, 0.125, 0.115) * (cloud - 0.5) * 0.72;",
    "  sky += vec3(0.16, 0.115, 0.045) * pow(max(cloud - 0.52, 0.0), 2.0) * 0.9;",

    // gouden kalligrafische lichtdeeltjes
    "  vec3 gold = vec3(0.855, 0.690, 0.290);",
    "  float glow = 0.0;",
    "  float sparkle = 0.0;",
    "  for (int i = 0; i < 22; i++) {",
    "    float fi = float(i);",
    "    float s1 = hash21(vec2(fi, 7.13));",
    "    float s2 = hash21(vec2(fi, 21.77));",
    "    float depth = 0.35 + 0.65 * s2;",
    "    vec2 base = vec2(hash21(vec2(fi, 1.70)) * 2.0 - 1.0,",
    "                     hash21(vec2(fi, 3.11)) * 1.9 - 1.0);",
    "    float drift = 0.9 + s1 * 1.4;",
    "    vec2 pos = base + vec2(sin(uTime * 0.10 * drift + fi * 1.3) * 0.055,",
    "                           cos(uTime * 0.085 * drift + fi * 2.1) * 0.045);",
    "    pos.x *= max(1.0, uRes.x / uRes.y);",
    "    pos += uPointer * depth * 0.045;",
    "    pos.y += uScroll * depth * 0.10;",

    "    vec2 d = p - pos;",
    "    float ang = 0.55 * sin(uTime * 0.22 + fi * 1.7) + s1 * 3.14159;",
    "    vec2 dir = vec2(cos(ang), sin(ang));",
    "    float along = dot(d, dir);",
    "    float across = dot(d, vec2(-dir.y, dir.x));",
    "    float stretch = 0.030 + 0.030 * s2;",
    "    float halfWidth = 0.0034 + 0.0026 * s1;",
    "    float stroke = exp(-pow(along / stretch, 2.0)) * exp(-pow(across / halfWidth, 2.0));",
    "    float core = exp(-dot(d, d) / 0.000035);",
    "    float halo2 = exp(-dot(d, d) / 0.0016);",
    "    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + s1 * 0.8) + fi * 2.3);",
    "    glow += (stroke * 0.55 + halo2 * 0.35) * twinkle * depth;",
    "    sparkle += core * twinkle;",
    "  }",
    "  sky += gold * glow * 0.42 * uIntro;",
    "  sky += mix(gold, vec3(1.0), 0.35) * sparkle * 0.55 * uIntro;",

    // leesbaarheid onderaan, vignet en korrel
    "  sky *= mix(0.55, 1.0, smoothstep(0.0, 0.62, uv.y));",
    "  float vig = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.1, 1.0)));",
    "  sky *= mix(0.72, 1.0, vig);",
    "  float grain = hash21(gl_FragCoord.xy + fract(uTime * 0.7) * 137.0) - 0.5;",
    "  sky += grain * 0.045;",

    "  gl_FragColor = vec4(sky, 1.0);",
    "}"
  ].join("\n");

  var gl = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false
    }) || canvas.getContext("experimental-webgl");
  } catch (error) {
    gl = null;
  }
  if (!gl) return;

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vertShader = compile(gl.VERTEX_SHADER, VERT);
  var fragShader = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vertShader || !fragShader) return;

  var program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  var aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, "uRes");
  var uTime = gl.getUniformLocation(program, "uTime");
  var uPointer = gl.getUniformLocation(program, "uPointer");
  var uScroll = gl.getUniformLocation(program, "uScroll");
  var uIntro = gl.getUniformLocation(program, "uIntro");

  var state = {
    width: 0,
    height: 0,
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    scroll: 0,
    scrollTarget: 0,
    intro: 0,
    start: 0,
    last: 0,
    visible: true,
    raf: 0,
    running: false
  };

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var cssWidth = Math.max(1, Math.round(rect.width));
    var cssHeight = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var budget = Math.sqrt(2200000 / (cssWidth * cssHeight));
    var scale = Math.max(0.6, Math.min(dpr, budget));
    var width = Math.round(cssWidth * scale);
    var height = Math.round(cssHeight * scale);
    if (width === state.width && height === state.height) return;
    state.width = width;
    state.height = height;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uRes, width, height);
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    state.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    state.targetY = 1 - (event.clientY / window.innerHeight) * 2;
    state.targetX = Math.max(-1, Math.min(1, state.targetX));
    state.targetY = Math.max(-1, Math.min(1, state.targetY));
  }

  function onScroll() {
    var span = Math.max(1, window.innerHeight);
    state.scrollTarget = Math.max(0, Math.min(1.2, window.scrollY / span));
  }

  function frame(now) {
    if (!state.running) return;
    var dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 0.016;
    state.last = now;

    state.pointerX += (state.targetX - state.pointerX) * Math.min(1, dt * 3.2);
    state.pointerY += (state.targetY - state.pointerY) * Math.min(1, dt * 3.2);
    state.scroll += (state.scrollTarget - state.scroll) * Math.min(1, dt * 6);
    state.intro = Math.min(1, state.intro + dt * 0.72);

    gl.uniform1f(uTime, (now - state.start) / 1000);
    gl.uniform2f(uPointer, state.pointerX, state.pointerY);
    gl.uniform1f(uScroll, state.scroll);
    gl.uniform1f(uIntro, state.intro * state.intro * (3 - 2 * state.intro));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    state.raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (state.running || reduceQuery.matches || document.hidden) return;
    state.running = true;
    if (!state.start) {
      state.start = performance.now();
      state.last = 0;
    }
    canvas.setAttribute("data-ready", "true");
    state.raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    state.running = false;
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;
  }

  function sync() {
    if (!state.visible || document.hidden || reduceQuery.matches) stop();
    else start();
  }

  function onContextLost(event) {
    event.preventDefault();
    stop();
    canvas.removeAttribute("data-ready");
  }

  resize();
  onScroll();
  sync();

  window.addEventListener("resize", function () {
    resize();
    onScroll();
  }, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("webglcontextlost", onContextLost);
  document.addEventListener("visibilitychange", sync);

  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", sync);
  else if (reduceQuery.addListener) reduceQuery.addListener(sync);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      state.visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.02 }).observe(canvas);
  }
})();
