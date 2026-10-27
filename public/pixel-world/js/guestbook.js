'use strict';
/* =============================================================================
   js/guestbook.js
   留言栏（/api/guestbook + localStorage 降级）
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 留言栏 ================= */
/* 数据流：优先读写 /api/guestbook（Cloudflare Pages Function + KV，全站共享）；
   接口不可用时降级为 localStorage 本地模式（按天分键，同样遵循每日清空 + 10 条上限）。
   服务端规则见 functions/api/guestbook.js：
   - 以固定 UTC+8、每天 05:00 为“天”，跨天自动换键 = 每天凌晨 5 点清空
   - 每天最多 10 条，写满后拒绝并返回 full:true
   - 邮箱必填并校验格式，仅存 KV 作凭证，不下发、不展示 */
(function guestbook(){
  const KEY_PREFIX = 'pw_guestbook:';
  const MAX = 10;
  const list = $('#gb-list');
  const form = $('#gb-form');
  const quota = $('#gb-quota');
  let online = false;

  // “天”以每天 05:00（UTC+8）为界，与服务端口径一致：拨快 3 小时让 5 点对齐午夜再取日期
  function today(){
    return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  }
  function hue(s){ let h = 0; for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function fmt(t){
    const d = new Date(t), p = n => String(n).padStart(2, '0');
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function localGet(){ return store.get(KEY_PREFIX + today(), []); }
  function localSet(msgs){ store.set(KEY_PREFIX + today(), msgs); }
  function setQuota(n){
    quota.textContent = '今日 ' + n + '/' + MAX;
    quota.classList.toggle('full', n >= MAX);
  }
  function render(msgs){
    msgs = Array.isArray(msgs) ? msgs : [];
    if(!msgs.length){
      list.innerHTML = '<div class="gb-msg px-panel"><div class="avatar" style="background:var(--panel3);color:var(--faint)">?</div><p style="color:var(--faint)">还没有留言，来刻第一块吧。</p></div>';
    }else{
      list.innerHTML = msgs.map(m =>
        '<div class="gb-msg px-panel">' +
          '<div class="avatar" style="background:hsl(' + hue(m.n) + ',55%,48%)">' + escapeHtml(m.n.slice(0, 1)) + '</div>' +
          '<div><div class="head"><b>' + escapeHtml(m.n) + '</b><time>' + fmt(m.time) + '</time></div><p>' + escapeHtml(m.t) + '</p></div>' +
        '</div>'
      ).join('');
    }
    setQuota(msgs.length);
  }
  function fullToast(){
    toast('今天的留言墙已刻满（' + MAX + '/' + MAX + '），凌晨 5 点清空后再来');
  }
  function clearText(){
    $('#gb-text').value = '';
    $('#gb-counter').textContent = '0/120';
  }

  // ---- 加载：云端优先，失败降级本地 ----
  const ready = (async function load(){
    try{
      const r = await fetch('/api/guestbook', { cache: 'no-store' });
      if(r.ok){
        const d = await r.json();
        if(d && d.configured !== false){
          online = true;
          render(d.messages);
          return;
        }
      }
    }catch(e){ /* 接口不可达 → 本地模式 */ }
    online = false;
    $('#gb-local-note').hidden = false;
    render(localGet());
  })();

  $('#gb-text').addEventListener('input', e => {
    $('#gb-counter').textContent = e.target.value.length + '/120';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    await ready;
    const name = $('#gb-name').value.trim();
    const email = $('#gb-email').value.trim();
    const text = $('#gb-text').value.trim();
    if(!email){ toast('请先留下勇者邮箱'); $('#gb-email').focus(); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('邮箱格式好像不太对'); $('#gb-email').focus(); return; }
    if(!name){ toast('勇者名号不能为空'); $('#gb-name').focus(); return; }
    if(!text){ toast('留言内容不能为空'); $('#gb-text').focus(); return; }

    if(online){
      let d;
      try{
        const r = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, text: text })
        });
        d = await r.json();
      }catch(err){
        toast('网络不稳，留言失败，稍后再试');
        return;
      }
      render(d.messages || []);
      if(d.ok){
        clearText();
        toast('留言已刻下');
      }else if(d.full){
        fullToast();
      }else{
        toast(d.message || '留言失败，请稍后再试');
      }
      return;
    }

    // 本地模式：同样执行每日清空 + 10 条上限
    const msgs = localGet();
    if(msgs.length >= MAX){ fullToast(); return; }
    msgs.unshift({ n: name, t: text, time: Date.now() });
    localSet(msgs.slice(0, MAX));
    clearText();
    render(msgs);
    toast('留言已刻下');
  });
})();
