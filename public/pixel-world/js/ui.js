'use strict';
/* =============================================================================
   js/ui.js
   导航下滑隐藏 / 导航高亮 / 入场动画 / HERO 视差
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 导航：下滑隐藏 / 上滑（任意位置）显示 ================= */
(function navBehavior(){
  const nav = $('#nav');
  let lastY = window.scrollY;
  let ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const dy = y - lastY;
      if(y < 8 || dy < -4){
        /* 顶部 或 任意位置上滑 → 立即显示 */
        nav.classList.remove('hide');
      } else if(dy > 4 && y > 90){
        /* 下滑且离开首屏 → 隐藏 */
        nav.classList.add('hide');
      }
      /* dy 在 ±4 内不切换，防止触控板微抖闪烁 */
      nav.classList.toggle('lift', y > 10);
      $('#scroll-hint').style.opacity = y > 60 ? '0' : '1';
      lastY = y;
      ticking = false;
    });
  }
  /* 初始/刷新恢复位置时按位置定夺 */
  nav.classList.toggle('hide', window.scrollY > 90);
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ================= 入场动画 ================= */
(function reveal(){
  const io = new IntersectionObserver(entries => {
    entries.forEach((en, i) => {
      if(en.isIntersecting){
        en.target.style.transitionDelay = (i % 4) * 60 + 'ms';
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
})();

/* ================= 导航高亮 ================= */
(function activeLink(){
  const map = {};
  $$('.nav-link').forEach(a => { map[a.getAttribute('href').slice(1)] = a; });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const a = map[en.target.id];
      if(a && en.isIntersecting){
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        a.classList.add('active');
      }
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  Object.keys(map).forEach(id => { const el = document.getElementById(id); if(el) io.observe(el); });
})();

/* ================= HERO 视差 ================= */
(function parallax(){
  const scene = $('#hero-scene'), content = $('#hero-content');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if(y < window.innerHeight * 1.2){
        scene.style.transform = 'translateY(' + y * 0.18 + 'px)';
        content.style.transform = 'translateY(' + y * 0.32 + 'px)';
        content.style.opacity = String(Math.max(0, 1 - y / 520));
      }
      ticking = false;
    });
  }, { passive: true });
})();
