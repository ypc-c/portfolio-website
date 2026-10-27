'use strict';
/* =============================================================================
   js/theme.js
   主题（紫夜/森林/熔岩/冰原）与亮暗切换、壁纸选择
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 主题 / 亮暗 ================= */
const THEMES = [
  { id:'purple', name:'紫夜' },
  { id:'forest', name:'翠影' },
  { id:'lava',   name:'熔岩' },
  { id:'ice',    name:'冰蕊' }
];
(function themeControl(){
  const body = document.body;
  let idx = THEMES.findIndex(t => t.id === store.get('pw_theme', 'purple'));
  if(idx < 0) idx = 0;
  function apply(){
    body.dataset.theme = THEMES[idx].id;
    store.set('pw_theme', THEMES[idx].id);
    window.dispatchEvent(new Event('pw:palette'));
    $$('#picker .theme-opt').forEach(b => b.classList.toggle('on', b.dataset.themeId === THEMES[idx].id));
  }
  apply();

  /* ---- 首屏壁纸：默认跟随亮暗（白昼→壁纸一，夜幕→壁纸二） ---- */
  const WALLS = [
    { id:'auto', name:'自动跟随', file:null },
    { id:'bg1', name:'壁纸一', file:'img/hero-bg.webp' },
    { id:'bg2', name:'壁纸二', file:'img/hero-bg2.webp' }
  ];
  const photo = $('.hero-photo');
  let wallInited = false;
  function wallFile(id){
    if(id === 'bg1' || id === 'bg2') return WALLS.find(w => w.id === id).file;
    return body.dataset.mode === 'light' ? WALLS[1].file : WALLS[2].file; /* auto 按亮暗取值 */
  }
  function applyWall(id, silent){
    const valid = WALLS.some(w => w.id === id) ? id : 'auto';
    store.set('pw_wall', valid);
    /* 壁纸实际文件与 css/layout.css 里的 html[data-wall] 规则对应，JS 只负责选哪一张 */
    document.documentElement.dataset.wall = wallFile(valid) === WALLS[1].file ? 'bg1' : 'bg2';
    $$('#picker .wall-opt').forEach(b => b.classList.toggle('on', b.dataset.wall === valid));
    if(wallInited){ /* 首次加载不闪，后续切换才播放像素闪烁 */
      photo.classList.remove('swap'); void photo.offsetWidth; photo.classList.add('swap');
    }
    wallInited = true;
    if(!silent){
      if(valid === 'auto'){
        toast('壁纸：自动跟随亮暗（当前 ' + (body.dataset.mode === 'light' ? '白昼 · 壁纸一' : '夜幕 · 壁纸二') + '）');
      }else{
        toast('壁纸切换：' + WALLS.find(w => w.id === valid).name);
      }
    }
  }
  WALLS.forEach(w => { if(w.file){ const im = new Image(); im.src = w.file; } }); /* 预加载，切换秒出 */

  /* ---- 主题按钮 → 弹出选择面板 ---- */
  const picker = $('#picker');
  const btnTheme = $('#btn-theme');
  function closePicker(){ picker.classList.remove('show'); }
  btnTheme.addEventListener('click', e => {
    e.stopPropagation();
    picker.classList.toggle('show');
  });
  document.addEventListener('click', e => {
    if(!picker.classList.contains('show')) return;
    if(picker.contains(e.target) || btnTheme.contains(e.target)) return;
    closePicker();
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closePicker(); });

  $$('#picker .wall-opt').forEach(b => b.addEventListener('click', () => applyWall(b.dataset.wall)));
  $$('#picker .theme-opt').forEach(b => b.addEventListener('click', () => {
    const i = THEMES.findIndex(t => t.id === b.dataset.themeId);
    if(i < 0) return;
    idx = i;
    apply();
    toast('主题切换：' + THEMES[idx].name);
  }));

  const sun = $('#icon-sun'), moon = $('#icon-moon');
  function applyMode(){
    const mode = store.get('pw_mode', 'dark');
    body.dataset.mode = mode;
    sun.style.display = mode === 'light' ? 'block' : 'none';
    moon.style.display = mode === 'light' ? 'none' : 'block';
    $('#hero-scene').classList.toggle('day', mode === 'light');
    if(store.get('pw_wall', 'auto') === 'auto') applyWall('auto', true); /* 壁纸跟随亮暗 */
    window.dispatchEvent(new Event('pw:palette'));
  }
  applyMode();
  if(store.get('pw_wall', 'auto') !== 'auto') applyWall(store.get('pw_wall', 'auto'), true); /* 手动选过则按选择来 */
  $('#btn-mode').addEventListener('click', () => {
    const next = body.dataset.mode === 'light' ? 'dark' : 'light';
    store.set('pw_mode', next);
    applyMode();
    toast(next === 'light' ? '切换到白昼' : '切换到夜幕');
  });
})();
