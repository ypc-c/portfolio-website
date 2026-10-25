/*
 * OptionWheel —— 原生 JS 版（移植自 React/JSX 组件）
 * 行为等价：连续位置缓动、滚轮/拖拽/键盘控制、沿曲线布局选项、选中回调。
 * 暴露 window.OptionWheel({...}) ，返回 { root, getSelected }。
 */
(function () {
  'use strict';

  function OptionWheel(options) {
    const o = options || {};
    const items = Array.isArray(o.items) ? o.items : ['雨夜便利店', '气象之间'];
    const defaultSelected = typeof o.defaultSelected === 'number' ? o.defaultSelected : 0;
    const onChange = typeof o.onChange === 'function' ? o.onChange : function () {};
    const textColor = o.textColor || '#a6a6a6';
    const activeColor = o.activeColor || '#ffffff';
    const side = o.side === 'right' ? 'right' : 'left';
    const fontSize = typeof o.fontSize === 'number' ? o.fontSize : 2.2;
    const spacing = typeof o.spacing === 'number' ? o.spacing : 1.4;
    const curve = typeof o.curve === 'number' ? o.curve : 1;
    const tilt = typeof o.tilt === 'number' ? o.tilt : 6;
    const blur = typeof o.blur === 'number' ? o.blur : 2;
    const fade = typeof o.fade === 'number' ? o.fade : 0.25;
    const minOpacity = typeof o.minOpacity === 'number' ? o.minOpacity : 0.05;
    const smoothing = typeof o.smoothing === 'number' ? o.smoothing : 200;
    const inset = typeof o.inset === 'number' ? o.inset : 80;
    const loop = o.loop === true;
    const draggable = o.draggable !== false;

    // ---- DOM 构建 ----
    const root = document.createElement('div');
    root.className = 'option-wheel' + (side === 'right' ? ' option-wheel--right' : '');
    root.setAttribute('role', 'listbox');
    root.setAttribute('tabIndex', '0');
    root.setAttribute('aria-label', '空间选择轮盘');
    root.style.setProperty('--ow-text-color', textColor);
    root.style.setProperty('--ow-active-color', activeColor);
    root.style.setProperty('--ow-font-size', fontSize + 'rem');
    root.style.setProperty('--ow-inset', inset + 'px');

    const itemEls = [];
    items.forEach(function (label, i) {
      const el = document.createElement('div');
      el.className = 'option-wheel__item';
      el.setAttribute('role', 'option');
      el.textContent = label;
      el.addEventListener('click', function () { handleItemClick(i); });
      root.appendChild(el);
      itemEls.push(el);
    });

    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    const cfg = {
      count: items.length,
      items: items,
      rowH: Math.max(fontSize * spacing * remPx, 1),
      curve: curve,
      tilt: tilt,
      blur: blur,
      fade: fade,
      minOpacity: minOpacity,
      side: side,
      loop: loop,
      smoothing: smoothing,
      draggable: draggable
    };

    let pos = defaultSelected;
    let target = defaultSelected;
    let selected = defaultSelected;
    let raf = null;
    let last = 0;
    let drag = null;
    let dragMoved = false;
    let wheelTimer = null;

    const mirror = side === 'right' ? -1 : 1;

    // ---- 单 rAF 循环：缓动位置 + 沿曲线布局 ----
    function runFrame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const tau = Math.max(smoothing, 1) / 1000;
      const k = 1 - Math.exp(-dt / tau);

      const nextPos = pos + (target - pos) * k;
      pos = Math.abs(target - nextPos) < 0.001 ? target : nextPos;

      const n = cfg.count;
      const tiltRad = (cfg.tilt * Math.PI) / 180;
      const R = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0;

      for (let i = 0; i < n; i++) {
        const el = itemEls[i];
        let d = i - pos;
        if (cfg.loop && n > 1) {
          d = ((d % n) + n) % n;
          if (d > n / 2) d -= n;
        }
        const dist = Math.abs(d);
        let x = 0;
        let y = d * cfg.rowH;
        let rot = 0;
        if (R > 0) {
          const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
          y = R * Math.sin(ang);
          x = -mirror * R * (1 - Math.cos(ang)) * cfg.curve;
          rot = (mirror * ang * 180) / Math.PI;
        }
        el.style.transform =
          'translate(' + x.toFixed(2) + 'px, calc(' + y.toFixed(2) + 'px - 50%)) rotate(' + rot.toFixed(3) + 'deg)';
        el.style.opacity = String(Math.max(cfg.minOpacity, 1 - dist * cfg.fade));
        el.style.filter = cfg.blur > 0 ? 'blur(' + (dist * cfg.blur).toFixed(2) + 'px)' : 'none';
        el.style.setProperty('--ow-p', Math.max(0, 1 - Math.min(dist, 1)).toFixed(4));
        el.classList.toggle('option-wheel__item--selected', Math.round(pos) === i);
      }

      raf = pos === target ? null : requestAnimationFrame(runFrame);
    }

    function startLoop() {
      if (raf != null) cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(runFrame);
    }

    function applyTarget(value, snap) {
      let v = value;
      if (!cfg.loop) v = Math.min(Math.max(v, 0), Math.max(cfg.count - 1, 0));
      if (snap) v = Math.round(v);
      target = v;
      const idx = ((Math.round(v) % cfg.count) + cfg.count) % cfg.count;
      if (idx !== selected) {
        selected = idx;
        onChange(idx, cfg.items[idx]);
      }
      startLoop();
    }

    // ---- 滚轮 / 触控板 ----
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const step = Math.max(-1, Math.min(1, delta / cfg.rowH));
      applyTarget(target + step, false);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { applyTarget(target, true); }, 140);
    }, { passive: false });

    // ---- 拖拽 ----
    root.addEventListener('pointerdown', function (e) {
      if (!cfg.draggable) return;
      drag = { y: e.clientY, start: target, id: e.pointerId };
      dragMoved = false;
      root.classList.add('option-wheel--dragging');
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (!dragMoved && Math.abs(dy) > 4) {
        dragMoved = true;
        try { root.setPointerCapture(drag.id); } catch (err) {}
      }
      if (dragMoved) applyTarget(drag.start - dy / cfg.rowH, false);
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      root.classList.remove('option-wheel--dragging');
      if (dragMoved) applyTarget(target, true);
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    // ---- 点击某一项 ----
    function handleItemClick(i) {
      if (dragMoved) return; // 拖拽误触不触发
      const cur = ((pos % cfg.count) + cfg.count) % cfg.count;
      let d = i - cur;
      if (cfg.loop && cfg.count > 1) {
        if (d > cfg.count / 2) d -= cfg.count;
        else if (d < -cfg.count / 2) d += cfg.count;
      }
      applyTarget(pos + d, true);
    }

    // ---- 键盘 ----
    root.addEventListener('keydown', function (e) {
      let delta = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
      if (delta == null) return;
      e.preventDefault();
      applyTarget(Math.round(target) + delta, true);
    });

    // ---- 初始化 ----
    applyTarget(target, false);

    return {
      root: root,
      getSelected: function () { return selected; }
    };
  }

  window.OptionWheel = OptionWheel;
})();
