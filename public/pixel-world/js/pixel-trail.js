'use strict';
/* =============================================================================
   js/pixel-trail.js
   像素鼠标拖尾（WebGL2）
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 像素鼠标拖尾（WebGL2，移植自 React PixelTrail） ================= */
(function pixelTrail(){
  const container = document.getElementById('pixel-trail');
  if(!container) return;
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const TRAIL_SIZE = 512;
  const AGE_SIZE = 256;
  const SHAPES = { square: 0, circle: 1, diamond: 2 };
  const DECAYS = { fade: 0, shrink: 1, dither: 2 };

  const VERTEX = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_trail;
uniform sampler2D u_image;
uniform sampler2D u_age;
uniform vec2 u_resolution;
uniform float u_gridSize;
uniform float u_sigma;
uniform vec3 u_color;
uniform vec3 u_trailColor;
uniform float u_ramp;
uniform float u_shine;
uniform float u_glow;
uniform int u_shape;
uniform int u_decay;
uniform float u_gap;
uniform float u_sparkle;
uniform float u_time;
uniform float u_hasImage;
out vec4 outColor;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
const vec3 LIGHT = vec3(-0.42, 0.58, 0.7);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float erfApprox(float x) {
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}

float cellValue(ivec2 c) {
  vec2 center = (vec2(c) + 0.5) / u_gridSize;
  if (center.x < 0.0 || center.y < 0.0 || center.x > 1.0 || center.y > 1.0) return 0.0;
  float t = texelFetch(u_trail, clamp(ivec2(center * 512.0), ivec2(0), ivec2(511)), 0).r;
  if (t <= 0.0) return 0.0;
  if (u_sparkle > 0.0) {
    float n = hash(vec2(c) + floor(u_time * 14.0) * 7.31);
    float dim = 1.0 - t;
    if (n < u_sparkle * dim * 0.35) t = max(t, 0.85);
    else if (n > 1.0 - u_sparkle * dim * 0.5) t = 0.0;
  }
  if (u_decay == 2 && t * 2.2 <= (BAYER[(c.y & 3) * 4 + (c.x & 3)] + 0.5) / 16.0) return 0.0;
  return t;
}

vec3 baseColor(ivec2 owner, vec2 uv) {
  if (u_hasImage > 0.5) return texelFetch(u_image, clamp(owner, ivec2(0), ivec2(textureSize(u_image, 0)) - 1), 0).rgb;
  if (u_ramp > 0.5) return mix(u_trailColor, u_color, smoothstep(0.05, 0.95, texture(u_age, uv).r));
  return u_color;
}

vec3 tone(vec3 base, float strength) {
  vec3 body = mix(base * 0.55, base, smoothstep(0.3, 0.75, strength));
  return mix(body, mix(base, vec3(1.0), 0.22), smoothstep(0.85, 1.0, strength) * u_shine);
}

float seams(vec2 q, float cs) {
  if (u_gap <= 0.0) return 0.0;
  vec2 f = fract(q / cs);
  float border = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cs;
  float width = max(1.0, u_gap * cs * 0.5);
  return 1.0 - smoothstep(width - 0.75, width + 0.75, border);
}

vec3 shade(vec3 base, vec3 n) {
  vec3 l = normalize(LIGHT);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float lit = dot(n, l) - l.z;
  vec3 color = base * (1.0 + lit * 0.9 * u_shine);
  float spec = pow(max(dot(n, h), 0.0), 64.0) * 0.85 + pow(max(dot(n, h), 0.0), 10.0) * 0.08;
  color += spec * u_shine * mix(vec3(1.0), base, 0.15) * step(0.001, 1.0 - n.z);
  return clamp(color, 0.0, 1.0);
}

void main() {
  float maxRes = max(u_resolution.x, u_resolution.y);
  vec2 q = gl_FragCoord.xy - 0.5 * u_resolution + 0.5 * maxRes;
  vec2 uv = q / maxRes;
  float cs = maxRes / u_gridSize;
  ivec2 base = ivec2(floor(q / cs));

  float alpha = 0.0;
  vec3 color = vec3(0.0);

  if (u_sigma > 0.0) {
    float inv = 0.70710678 / u_sigma;
    float norm = 0.39894228 / u_sigma;
    float spread = 0.5 / (u_sigma * u_sigma);
    int reach = int(clamp(ceil(3.0 * u_sigma / cs), 1.0, 3.0));
    float field = 0.0;
    vec2 grad = vec2(0.0);
    float best = -1.0;
    ivec2 owner = base;
    float wx[7];
    float gx[7];
    float wy[7];
    float gy[7];
    for (int i = 0; i < 7; i++) {
      int offset = i - 3;
      if (abs(offset) > reach) continue;
      vec2 lo = vec2(base + ivec2(offset)) * cs - q;
      vec2 hi = lo + cs;
      wx[i] = 0.5 * (erfApprox(hi.x * inv) - erfApprox(lo.x * inv));
      wy[i] = 0.5 * (erfApprox(hi.y * inv) - erfApprox(lo.y * inv));
      gx[i] = norm * (exp(-lo.x * lo.x * spread) - exp(-hi.x * hi.x * spread));
      gy[i] = norm * (exp(-lo.y * lo.y * spread) - exp(-hi.y * hi.y * spread));
    }
    for (int j = 0; j < 7; j++) {
      if (abs(j - 3) > reach) continue;
      for (int i = 0; i < 7; i++) {
        if (abs(i - 3) > reach) continue;
        ivec2 c = base + ivec2(i - 3, j - 3);
        float t = cellValue(c);
        if (t <= 0.0) continue;
        float weight = t * wx[i] * wy[j];
        field += weight;
        grad += t * vec2(gx[i] * wy[j], wx[i] * gy[j]);
        if (weight > best) {
          best = weight;
          owner = c;
        }
      }
    }
    float edge = max(0.0263, length(grad) * 0.6);
    alpha = smoothstep(0.5 - edge, 0.5 + edge, field);
    if (alpha > 0.0) {
      vec3 n = normalize(vec3(-grad * cs * 0.55, 1.0));
      float strength = max(cellValue(base), field);
      vec3 body = tone(baseColor(owner, uv), strength);
      body *= 1.0 - seams(q, cs) * 0.32;
      color = shade(body, n);
    }
  } else {
    float t = cellValue(base);
    if (t > 0.0) {
      float halfSize = 0.5 * (1.0 - u_gap);
      float fade = t;
      if (u_decay == 1) {
        halfSize *= sqrt(clamp(t * 2.5, 0.0, 1.0));
        fade = 1.0;
      } else if (u_decay == 2) {
        fade = 1.0;
      }
      vec2 local = fract(q / cs) - 0.5;
      float d;
      vec2 dir;
      if (u_shape == 1) {
        d = length(local) - halfSize;
        dir = normalize(local + 1e-5);
      } else if (u_shape == 2) {
        d = (abs(local.x) + abs(local.y) - halfSize * 1.2) * 0.7071;
        dir = sign(local) * 0.7071;
      } else {
        vec2 a = abs(local) - halfSize;
        d = max(a.x, a.y);
        dir = a.x > a.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y));
      }
      float px = 1.0 / cs;
      float coverage = clamp(0.5 - d / px, 0.0, 1.0);
      alpha = coverage * fade;
      if (alpha > 0.0) {
        float bevel = smoothstep(-0.16 * (1.0 - u_gap), 0.0, d);
        vec3 n = normalize(vec3(dir * bevel * 0.9, 1.0));
        color = shade(tone(baseColor(base, uv), t), n);
      }
    }
  }

  vec4 pixel = vec4(color * alpha, alpha);
  if (u_glow > 0.0) {
    float glow = texture(u_trail, uv).r;
    float amount = smoothstep(0.0, 0.7, glow) * u_glow * 0.55 * (1.0 - alpha);
    vec3 tint = u_hasImage > 0.5 ? texture(u_image, uv).rgb : (u_ramp > 0.5 ? mix(u_trailColor, u_color, 0.5) : u_color);
    pixel += vec4(tint * amount, amount);
  }
  if (pixel.a <= 0.002) discard;
  outColor = pixel;
}
`;

  const parseColor = (() => {
    let context = null;
    return (value, fallback) => {
      if (typeof document === 'undefined') return fallback;
      if (!context) {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        context = c.getContext('2d', { willReadFrequently: true });
      }
      if (!context) return fallback;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#000';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const d = context.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255];
    };
  })();

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  /* 拖尾参数：鲜亮金 → 主题色渐隐，细密方形像素格 + 轻黏合 + 闪烁 */
  const S = {
    gridSize: 110,
    trailSize: 0.07,
    maxAge: 320,
    interpolate: 5,
    ease: x => x,
    goo: 0.9,
    color: parseColor('#ffd23f', [1, 0.82, 0.25]),
    trailColor: parseColor('#b46cff', [0.7, 0.42, 1]),
    shape: SHAPES.square,
    gap: 0.12,
    decay: DECAYS.fade,
    flow: 0.25,
    gravity: 0,
    sparkle: 0.16,
    clickBurst: true,
    shine: 0.5,
    glow: 0.3,
    dpr: null
  };
  function refreshColors(){
    const gold = getComputedStyle(document.body).getPropertyValue('--gold').trim();
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    S.color = parseColor(gold || '#ffd23f', [1, 0.82, 0.25]);
    S.trailColor = parseColor(accent || '#b46cff', [0.7, 0.42, 1]);
  }
  refreshColors();

  const gl = canvas.getContext('webgl2', {
    alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance'
  });
  if(!gl){ console.warn('PixelTrail: 当前环境不支持 WebGL2，拖尾效果已停用'); return; }

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if(!vertex || !fragment || !program) return;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const U = {};
  ['u_trail','u_image','u_age','u_resolution','u_gridSize','u_sigma','u_color','u_trailColor',
   'u_ramp','u_shine','u_glow','u_shape','u_decay','u_gap','u_sparkle','u_time','u_hasImage']
   .forEach(n => { U[n] = gl.getUniformLocation(program, n); });

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const makeTexture = unit => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return texture;
  };
  const trailTexture = makeTexture(0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  makeTexture(1); /* u_image 占位（未启用图片模式） */
  const ageTexture = makeTexture(2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(U.u_trail, 0);
  gl.uniform1i(U.u_image, 1);
  gl.uniform1i(U.u_age, 2);

  const trailCanvas = document.createElement('canvas');
  trailCanvas.width = TRAIL_SIZE;
  trailCanvas.height = TRAIL_SIZE;
  const ctx = trailCanvas.getContext('2d');
  if(!ctx) return;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE);

  const ageCanvas = document.createElement('canvas');
  ageCanvas.width = AGE_SIZE;
  ageCanvas.height = AGE_SIZE;
  const ageCtx = ageCanvas.getContext('2d');
  if(!ageCtx) return;

  const state = {
    alive: true, raf: 0, last: 0, time: 0, visible: true,
    width: 1, height: 1, ratio: 1,
    points: [], force: 0,
    pointer: { x: 0, y: 0, at: 0, vx: 0, vy: 0, inside: false }
  };

  const addTouch = (x, y, vx, vy) => {
    const points = state.points;
    const last = points[points.length - 1];
    if(last){
      const dx = last.x - x, dy = last.y - y;
      const dd = dx * dx + dy * dy;
      const force = Math.max(0.3, Math.min(dd * 10000, 1));
      state.force = force;
      if(S.interpolate){
        const lines = Math.ceil(dd / Math.pow((S.trailSize * 0.5) / S.interpolate, 2));
        if(lines > 1){
          for(let i = 1; i < lines; i++){
            points.push({ x: last.x - (dx / lines) * i, y: last.y - (dy / lines) * i, age: 0, force, vx, vy });
          }
        }
      }
    }
    points.push({ x, y, age: 0, force: state.force, vx, vy });
  };

  const drawTouch = point => {
    const x = point.x * TRAIL_SIZE;
    const y = (1 - point.y) * TRAIL_SIZE;
    let intensity = 1;
    if(point.age < S.maxAge * 0.3){
      intensity = S.ease(point.age / (S.maxAge * 0.3));
    } else {
      intensity = S.ease(1 - (point.age - S.maxAge * 0.3) / (S.maxAge * 0.7));
    }
    intensity *= point.force;
    ctx.globalCompositeOperation = 'screen';
    const radius = Math.max(0, TRAIL_SIZE * S.trailSize * intensity);
    const gradient = ctx.createRadialGradient(x, y, Math.max(0, radius * 0.25), x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if(!S.trailColor || radius <= 0) return;
    const scale = AGE_SIZE / TRAIL_SIZE;
    const fresh = Math.round(255 * Math.min(Math.max(1 - point.age / S.maxAge, 0), 1));
    const glaze = ageCtx.createRadialGradient(x * scale, y * scale, 0, x * scale, y * scale, radius * scale);
    glaze.addColorStop(0, `rgb(${fresh}, ${fresh}, ${fresh})`);
    glaze.addColorStop(0.75, `rgb(${fresh}, ${fresh}, ${fresh})`);
    glaze.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ageCtx.globalCompositeOperation = 'lighten';
    ageCtx.beginPath();
    ageCtx.fillStyle = glaze;
    ageCtx.arc(x * scale, y * scale, radius * scale, 0, Math.PI * 2);
    ageCtx.fill();
  };

  const updateTrail = delta => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE);
    ageCtx.globalCompositeOperation = 'source-over';
    ageCtx.fillStyle = 'black';
    ageCtx.fillRect(0, 0, AGE_SIZE, AGE_SIZE);
    for(let i = state.points.length - 1; i >= 0; i--){
      const p = state.points[i];
      p.age += delta * 1000;
      if(p.age > S.maxAge) state.points.splice(i, 1);
    }
    if(!state.points.length) state.force = 0;
    if(S.flow > 0 || S.gravity !== 0){
      const drag = Math.exp(-3 * delta);
      for(const p of state.points){
        p.vx *= drag;
        p.vy = p.vy * drag - S.gravity * 1.6 * delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
      }
    }
    state.points.forEach(drawTouch);
  };

  const burst = (x, y) => {
    const count = 14;
    for(let k = 0; k < count; k++){
      const angle = (k / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.35 + Math.random() * 0.25;
      state.points.push({ x, y, age: 0, force: 1, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
  };

  const resize = () => {
    const ratio = S.dpr ?? Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    state.width = width;
    state.height = height;
    state.ratio = ratio;
    const pw = Math.max(1, Math.floor(width * ratio));
    const ph = Math.max(1, Math.floor(height * ratio));
    if(canvas.width !== pw || canvas.height !== ph){
      canvas.width = pw;
      canvas.height = ph;
    }
  };

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, ageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ageCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.uniform2f(U.u_resolution, state.width * state.ratio, state.height * state.ratio);
    gl.uniform1f(U.u_gridSize, S.gridSize);
    gl.uniform3fv(U.u_color, S.color);
    gl.uniform3fv(U.u_trailColor, S.trailColor);
    gl.uniform1f(U.u_ramp, S.trailColor ? 1 : 0);
    gl.uniform1f(U.u_sigma, S.goo * state.ratio);
    gl.uniform1f(U.u_shine, S.shine);
    gl.uniform1f(U.u_glow, S.glow);
    gl.uniform1i(U.u_shape, S.shape);
    gl.uniform1i(U.u_decay, S.decay);
    gl.uniform1f(U.u_gap, S.gap);
    gl.uniform1f(U.u_sparkle, S.sparkle);
    gl.uniform1f(U.u_time, state.time);
    gl.uniform1f(U.u_hasImage, 0);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const frame = now => {
    state.raf = 0;
    if(!state.alive) return;
    const delta = state.last ? (now - state.last) / 1000 : 1 / 60;
    state.last = now;
    state.time += delta;
    resize();
    updateTrail(delta);
    draw();
    if(state.points.length && state.visible) state.raf = requestAnimationFrame(frame);
    else state.last = 0;
  };

  const wake = () => {
    if(!state.raf && state.alive && state.visible) state.raf = requestAnimationFrame(frame);
  };

  let rect = null, rectDirty = true;
  const markDirty = () => { rectDirty = true; };
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', markDirty);
  const getRect = () => {
    if(rectDirty || !rect){ rect = container.getBoundingClientRect(); rectDirty = false; }
    return rect;
  };

  const toUv = event => {
    const r = getRect();
    const x = event.clientX - r.left;
    const y = event.clientY - r.top;
    const side = Math.max(r.width, r.height);
    return {
      x: (x - r.width / 2) / side + 0.5,
      y: (r.height / 2 - y) / side + 0.5,
      inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height
    };
  };

  const onMove = event => {
    const { x, y, inside } = toUv(event);
    const pointer = state.pointer;
    const now = performance.now();
    if(inside){
      const elapsed = Math.max(0.008, (now - pointer.at) / 1000);
      if(pointer.inside){
        pointer.vx += ((x - pointer.x) / elapsed - pointer.vx) * 0.5;
        pointer.vy += ((y - pointer.y) / elapsed - pointer.vy) * 0.5;
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
      }
      addTouch(x, y, pointer.vx * S.flow * 0.3, pointer.vy * S.flow * 0.3);
      wake();
    }
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.inside = inside;
  };

  const onDown = event => {
    const { x, y, inside } = toUv(event);
    if(!inside || !S.clickBurst) return;
    burst(x, y);
    wake();
  };

  const onLeave = () => { state.pointer.inside = false; };

  const resizeObserver = new ResizeObserver(() => { resize(); draw(); });
  resizeObserver.observe(container);

  const visibility = new IntersectionObserver(entries => {
    state.visible = entries.some(e => e.isIntersecting);
    if(state.visible) wake();
  });
  visibility.observe(container);

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  /* 主题 / 亮暗切换时刷新颜色并重绘 */
  window.addEventListener('pw:palette', () => { refreshColors(); draw(); });

  resize();
  draw();
})();
