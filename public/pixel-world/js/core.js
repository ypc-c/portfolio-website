'use strict';
/* =============================================================================
   js/core.js
   工具函数（$ / $$ / store / toast）+ 星空与萤火虫场景
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 工具 ================= */
const $ = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
let toastTimer = null;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= 场景：星星 / 萤火虫 ================= */
(function buildScene(){
  const stars = $('#stars');
  let html = '';
  for(let i = 0; i < 64; i++){
    const x = Math.floor(Math.random() * 950) + 4;
    const y = Math.floor(Math.random() * 300) + 10;
    const s = Math.random() < .18 ? 3 : 2;
    const cls = Math.random() < .3 ? ' twinkle' + (Math.random() < .5 ? ' d1' : ' d2') : '';
    html += '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="var(--star)" opacity="' + (0.5 + Math.random() * 0.5).toFixed(2) + '" class="' + cls.trim() + '"/>';
  }
  stars.innerHTML = html;
  const flies = $('#fireflies');
  let fh = '';
  for(let i = 0; i < 9; i++){
    const x = 60 + Math.floor(Math.random() * 840);
    const y = 380 + Math.floor(Math.random() * 130);
    fh += '<rect class="fly' + (i % 3 === 1 ? ' f2' : i % 3 === 2 ? ' f3' : '') + '" x="' + x + '" y="' + y + '" width="3" height="3" fill="var(--gold)" opacity=".9"/>';
  }
  flies.innerHTML = fh;
})();
