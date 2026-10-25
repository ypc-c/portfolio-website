/* ==========================================================
   异世界穿梭隧道 · WebGL2 光缆隧道引擎
   ----------------------------------------------------------
   移植自用户提供的 intro-tunnel 参考实现（React 组件 vanilla 化），
   作为首页「进入异世界」的一次性过场：以屏幕中心为消失点，
   光缆隧道从远处展开并冲向观众，配合冲击波（surge）与鼠标转向。

   用法（调用方负责覆盖层显隐与跳转）：
     if (WarpTunnel.supported()) {
       const engine = WarpTunnel.start(mountEl, {
         revealSeconds: 1.15,              // 隧道展开时长（秒）
         center: { x: cx, y: cy },         // 消失点（视口坐标，CSS px，可省略=屏幕中心）
         mouse: true                       // 鼠标转向
       });
       if (engine) {
         engine.surge();                   // 触发一次冲击波
         // ... 结束时：
         engine.destroy();
       }
     }
   降级由调用方处理：不支持 WebGL2 时 supported() 为 false、
   start() 返回 null；prefers-reduced-motion 不应调用本引擎。
   ========================================================== */
(function () {
  'use strict';

  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uRatio;
uniform float uTime;
uniform float uDrift;
uniform vec2 uSteer;
uniform float uBend;
uniform float uCount;
uniform float uSwing;
uniform float uWave;
uniform float uWidth;
uniform float uPulseWidth;
uniform float uHead;
uniform float uTail;
uniform float uChance;
uniform float uSpacing;
uniform float uPulseSpeed;
uniform float uFlow;
uniform float uHalo;
uniform float uGlow;
uniform float uBrightness;
uniform float uVariance;
uniform float uBody;
uniform float uFadeNear;
uniform float uFadeFar;
uniform vec3 uCable;
uniform vec3 uPulse;
uniform vec3 uTunnel;
uniform vec3 uSurge;
uniform float uReveal;
uniform float uGrain;
uniform float uSeed;
uniform float uLight;
uniform float uOpacity;
out vec4 outColor;

const float TAU = 6.2831853;

vec3 inkOf(vec3 color, float depthOfInk) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float peak = max(color.r, max(color.g, color.b));
  float chroma = (peak - min(color.r, min(color.g, color.b))) / max(peak, 0.001);
  return color * min(1.0, mix(depthOfInk, depthOfInk * 1.7, chroma) / max(luma, 0.001));
}

float hash(float n) {
  return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453);
}

vec2 bendAt(float depth) {
  float reach = 1.0 - exp(-max(depth, 0.0) * 0.55);
  vec2 wobble = vec2(sin(uDrift * 0.37 + depth * 0.31), cos(uDrift * 0.29 + depth * 0.23)) * uBend;
  return (wobble + uSteer) * reach;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution - uCenter) / uScale;
  float depth = -log(max(length(p), 1e-5));
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    q = p - bendAt(depth);
    depth = -log(max(length(q), 1e-5));
  }
  float r = length(q);
  float px = r * uScale;
  float turn = atan(q.y, q.x) / TAU;
  float s = turn - uSwing - uWave * sin(depth * 1.2 + uDrift * 0.5);
  float cell = floor(s * uCount);
  float spacing = TAU * px / uCount;
  float near = smoothstep(0.55, 1.25, r);
  float width = uWidth * (1.0 + near * 1.2);
  float soft = uRatio * (0.55 + near * 0.9);
  float tight = uRatio * uHalo * (1.0 + near);
  float wide = tight * 4.5;

  float lines = 0.0;
  float body = 0.0;
  vec3 glow = vec3(0.0);
  float strokes = 0.0;
  for (int k = -3; k <= 3; k++) {
    float i = cell + float(k);
    float id = mod(i, uCount);
    float h1 = hash(id);
    float h2 = hash(id + 17.0);
    float h3 = hash(id + 41.0);
    float h4 = hash(id + 73.0);
    float center = (i + 0.5 + (h1 - 0.5) * 0.55) / uCount;
    center += 0.12 * sin(depth * (0.8 + h2 * 0.9) + uDrift * (0.4 + h3 * 0.5) + h4 * TAU) / uCount;
    float d = abs(s - center) * TAU * px;
    float shade = 1.0 + uVariance * (h3 - 0.5) * 0.9;
    float reach = smoothstep(spacing * 2.4, spacing * 1.4, d);

    lines += smoothstep(width + soft, width - soft, d) * shade;
    body += exp(-d / max(spacing * 0.22, 0.001)) * shade * reach;

    float x = depth * uSpacing + uTime * uPulseSpeed * (0.55 + h2 * 0.6) * uFlow + h4 * 7.0;
    float lead = (fract(x) - 0.5) / uSpacing * uFlow;
    float lit = step(hash(id * 3.7 + floor(x) * 13.1), uChance);
    float limit = 0.5 / uSpacing;
    float head = exp(-pow(max(-lead, 0.0) / uHead, 2.0)) * smoothstep(-limit, -limit * 0.8, lead);
    float tail = exp(-max(lead, 0.0) / uTail) * smoothstep(limit, limit * 0.55, lead);
    float pulse = (lead < 0.0 ? head : tail) * lit;
    float ring = uSurge.y * exp(-pow((depth - uSurge.x) / uSurge.z, 2.0));
    pulse = max(pulse, ring);
    float hot = pulse * (lead < 0.0 ? 1.0 : exp(-max(lead, 0.0) / (uTail * 0.35)));

    float core = uPulseWidth * width + 0.35 * uRatio;
    float stroke = smoothstep(core + soft, core - soft, d);
    float bloom = (exp(-d / tight) * 0.7 + exp(-d / wide) * 0.18) * uGlow * reach;
    vec3 tint = mix(uPulse, vec3(1.0), hot * 0.55 * (1.0 - uLight));
    glow += tint * pulse * (stroke * 1.5 + bloom) * shade;
    strokes += pulse * stroke * shade;
  }

  float lod = smoothstep(4.0, 1.2, spacing);
  float average = min(2.0 * uWidth / max(spacing, 0.001), 1.0);
  lines = mix(lines, average, lod);
  glow = mix(glow, uPulse * average * 0.6 * uChance, lod);
  strokes = mix(strokes, average * 0.6 * uChance, lod);
  body = mix(body, 1.0, lod) * uBody;

  float rr = r * 0.25;
  float fade = smoothstep(0.0, uFadeNear, rr) * smoothstep(uFadeFar, uFadeFar * 0.55, rr);
  fade *= smoothstep(uReveal - 0.6, uReveal, depth);

  float grain = 1.0;
  if (uGrain > 0.0) {
    grain += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453) - 0.5) * uGrain * 4.0;
  }

  if (uLight > 0.5) {
    float hairline = clamp(lines * 0.26 + body * 0.2, 0.0, 1.0);
    float stroke = clamp(strokes * 1.6, 0.0, 1.0);
    float haze = clamp(length(glow) * 0.12, 0.0, 0.25);
    float ink = clamp(hairline + stroke + haze, 0.0, 1.0) * fade * uOpacity * grain;
    vec3 tone = mix(inkOf(uCable, 0.3), inkOf(uPulse, 0.16), clamp(stroke + haze * 2.0, 0.0, 1.0));
    tone = mix(tone, inkOf(uTunnel, 0.3), clamp(body * uBody, 0.0, 1.0) * 0.5);
    outColor = vec4(tone * ink, ink);
    return;
  }

  vec3 light = (uCable * lines * 0.12 + uTunnel * body * 0.35 + glow) * uBrightness * fade * grain;
  vec3 mapped = (1.0 - exp(-light * 1.4)) * uOpacity;
  outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
}`;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) { diag.push('createShader failed'); return null; }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    diag.push((type === gl.VERTEX_SHADER ? 'vertex' : 'fragment') + ' shader: ' + (gl.getShaderInfoLog(shader) || 'unknown'));
    gl.deleteShader(shader);
    return null;
  }

  function linkProgram(gl) {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      diag.push('link: ' + (gl.getProgramInfoLog(program) || 'unknown'));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  }

  /* 诊断信息：start() 失败原因（着色器日志 / 异常），供调试与降级判断 */
  const diag = [];

  /* 颜色探针：CSS 变量值（如 "#3d7de0"）→ rgb 三元组 */
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  function rgb(value, fallback) {
    if (!value) return fallback;
    const key = String(value);
    if (colorCache.has(key)) return colorCache.get(key);
    let out = fallback;
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000000';
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      out = [d[0] / 255, d[1] / 255, d[2] / 255];
    }
    colorCache.set(key, out);
    return out;
  }

  /* WebGL2 可用性探测（不保留上下文） */
  function supported() {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch (e) {
      return false;
    }
  }

  function start(mount, options) {
    if (!mount) return null;
    const opts = Object.assign({ revealSeconds: 1.15, mouse: true, center: null }, options || {});
    diag.length = 0;
    try {
      return begin(mount, opts);
    } catch (err) {
      diag.push('exception: ' + String((err && err.message) || err));
      return null;
    }
  }

  function begin(mount, opts) {

    /* 配色：opts > CSS 变量（--warp-cable/--warp-pulse/--warp-tunnel）> 硬编码回退 */
    const cssVars = getComputedStyle(mount);
    const cableColor = opts.cableColor || (cssVars.getPropertyValue('--warp-cable') || '').trim() || '#3d7de0';
    const pulseColor = opts.pulseColor || (cssVars.getPropertyValue('--warp-pulse') || '').trim() || '#ffffff';
    const tunnelColor = opts.tunnelColor || (cssVars.getPropertyValue('--warp-tunnel') || '').trim() || '#101a38';

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    let gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false
      });
    } catch (e) { gl = null; }
    if (!gl) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return null;
    }
    const linked = linkProgram(gl);
    if (!linked) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return null;
    }
    const u = linked.uniforms;

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const REVEAL = clamp(opts.revealSeconds, 0.2, 5);
    const S = {
      cableColor: cableColor,
      pulseColor: pulseColor,
      tunnelColor: tunnelColor,
      tunnelOpacity: 0,
      speed: 0.12,
      flow: 1, /* outward：冲向观众 */
      pulseSpeed: 2.2,
      pulseLength: 0.3,
      pulseBlend: 0.6,
      pulseWidth: 1.1,
      pulseDensity: 0.6,
      cableCount: 64,
      thickness: 0.35,
      rimWidth: 0.15,
      waviness: 0.3,
      sway: 0.5,
      bend: 0.4,
      size: 1,
      glow: 1.1,
      fadeNear: 0.5,
      fadeFar: 2,
      brightness: 1.05,
      colorVariance: true,
      grain: true,
      grainIntensity: 0.05,
      opacity: 1,
      mouseInteraction: !!opts.mouse,
      mouseStrength: 0.12,
      variation: 0,
      dpr: null
    };

    /* 消失点：视口坐标（CSS px，top-left 原点）→ 相对挂载点中心的偏移（y 向上） */
    let centerOff = { x: 0, y: 0 };
    function setCenter(pt) {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      const px = pt && typeof pt.x === 'number' ? pt.x : w / 2;
      const py = pt && typeof pt.y === 'number' ? pt.y : h / 2;
      centerOff = { x: px - w / 2, y: h / 2 - py };
    }
    setCenter(opts.center);

    const pointer = { x: 0, y: 0, inside: false };
    const steer = { x: 0, y: 0 };
    const surge = { age: 10 };
    let time = 0, drift = 0, reveal = 0, raf = 0, last = 0, visible = true, alive = true, frames = 0;

    function render() {
      const width = canvas.width;
      const height = canvas.height;
      const ratio = width / Math.max(1, mount.clientWidth);
      const minSide = Math.min(width, height);
      const flow = S.flow;
      const span = 3.4;
      const travel = surge.age * 2.6;
      const surgeDepth = flow > 0 ? span - travel : -0.6 + travel;
      const surgeLevel = surge.age < 2.4 ? Math.min(1, surge.age / 0.12) * Math.exp(-surge.age * 1.1) : 0;
      const eased = reveal * reveal * (3 - 2 * reveal);
      gl.viewport(0, 0, width, height);
      gl.useProgram(linked.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, width, height);
      gl.uniform2f(u.uCenter, centerOff.x * ratio, centerOff.y * ratio);
      gl.uniform1f(u.uScale, minSide * 0.5 * S.size);
      gl.uniform1f(u.uRatio, ratio);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uDrift, drift);
      gl.uniform2f(u.uSteer, steer.x, steer.y);
      gl.uniform1f(u.uBend, S.bend * 0.45);
      gl.uniform1f(u.uCount, S.cableCount);
      gl.uniform1f(u.uSwing, (Math.sin(drift * 0.9) * S.sway * 0.5) / (Math.PI * 2));
      gl.uniform1f(u.uWave, S.waviness * 0.15);
      gl.uniform1f(u.uWidth, (0.25 + S.thickness * 1.5) * ratio);
      gl.uniform1f(u.uPulseWidth, 0.6 + S.pulseWidth * 0.9);
      const length = S.pulseLength * 1.2;
      gl.uniform1f(u.uHead, length * (0.08 + S.pulseBlend * 0.22));
      gl.uniform1f(u.uTail, length * (0.5 + S.pulseBlend * 0.7));
      gl.uniform1f(u.uChance, S.pulseDensity);
      gl.uniform1f(u.uSpacing, 0.4);
      gl.uniform1f(u.uPulseSpeed, S.pulseSpeed * 4);
      gl.uniform1f(u.uFlow, flow);
      gl.uniform1f(u.uHalo, 1.2 + S.rimWidth * 8);
      gl.uniform1f(u.uGlow, S.glow);
      gl.uniform1f(u.uBrightness, S.brightness);
      gl.uniform1f(u.uVariance, S.colorVariance ? 1 : 0);
      gl.uniform1f(u.uBody, S.tunnelOpacity);
      gl.uniform1f(u.uFadeNear, S.fadeNear);
      gl.uniform1f(u.uFadeFar, S.fadeFar);
      gl.uniform3fv(u.uCable, rgb(S.cableColor, [1, 1, 1]));
      gl.uniform3fv(u.uPulse, rgb(S.pulseColor, [1, 1, 1]));
      gl.uniform3fv(u.uTunnel, rgb(S.tunnelColor, [1, 1, 1]));
      gl.uniform3f(u.uSurge, surgeDepth, surgeLevel, 0.22);
      gl.uniform1f(u.uReveal, 1.7 - eased * 3.6);
      gl.uniform1f(u.uGrain, S.grain ? S.grainIntensity : 0);
      gl.uniform1f(u.uSeed, S.variation);
      gl.uniform1f(u.uLight, 0);
      gl.uniform1f(u.uOpacity, S.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frames++;
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      time += dt * S.speed;
      drift += dt * (S.speed + 0.2);
      surge.age += dt;
      if (reveal < 1) reveal = Math.min(1, reveal + dt / REVEAL);

      const engaged = S.mouseInteraction && pointer.inside;
      const reach = S.mouseStrength * 2.5;
      const tx = engaged ? pointer.x * reach : 0;
      const ty = engaged ? pointer.y * reach : 0;
      const follow = 1 - Math.exp(-dt / 0.6);
      steer.x += (tx - steer.x) * follow;
      steer.y += (ty - steer.y) * follow;

      render();
      raf = requestAnimationFrame(frame); /* 过场期间持续渲染 */
    }

    function wake() {
      if (!raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function resize() {
      const ratio = Math.min(S.dpr || window.devicePixelRatio || 1, 2);
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      render();
      wake();
    }

    function locate(event) {
      const rect = mount.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const scale = Math.min(rect.width, rect.height) * 0.5;
      pointer.x = (x - rect.width / 2) / Math.max(1, scale);
      pointer.y = (rect.height / 2 - y) / Math.max(1, scale);
    }

    function onMove(event) { locate(event); wake(); }
    function onVisibility() { last = 0; wake(); }

    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const io = new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting);
      if (visible) { last = 0; wake(); }
    });
    io.observe(mount);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();

    return {
      /* 已渲染帧数（测试探针用） */
      frames() { return frames; },
      /* 冲击波：从隧道远端冲向观众 */
      surge() { surge.age = 0; },
      /* 释放全部 GL 资源并移除画布 */
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', onVisibility);
        gl.deleteProgram(linked.program);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.WarpTunnel = {
    supported: supported,
    start: start,
    /* 最近一次 start() 失败的诊断信息（正常运行时为空数组） */
    diag: function () { return diag.slice(); }
  };
})();
