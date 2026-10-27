'use strict';
/* =============================================================================
   js/content.js
   文章数据与渲染、友链渲染
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 文章数据 ================= */
const ARTICLES = [
  {
    tag:'生存', date:'2026-10-12', read:'6 分钟',
    title:'新手勇者生存指南：落地异世界的前 72 小时',
    thumb:'camp',
    excerpt:'降落地点选错，等于难度翻倍。这篇整理了我三次坠机、两次被史莱姆吞掉换来的经验。',
    body:[
      '落地之后第一件事不是确认属性面板，而是确认附近有没有水。异世界的太阳比现实世界毒，空腹赶路半小时就会进入脱水状态，而脱水状态下遇袭，逃跑成功率直接砍半。',
      '第二件事是捡树枝。任意两根中等长度的树枝加一段藤蔓就能做成一把勉强能用的长矛，有了它，史莱姆从骚扰变成送经验。别急着打，先观察它分裂不分裂——不分裂的那种随便打，会分裂的往身后引，逐个解决。',
      '第三件事，天黑前找到村落或洞穴。夜晚野外刷新率是白天的三倍，且会出现日间不活动的品种。如果找不到落脚点，找一片灌木丛生、背后是岩壁的地方生火，火不用大，但不能熄。',
      '最后一条：别信第一次遇见的自称"向导"的人。我被他骗走过一把剑和半块干粮。'
    ]
  },
  {
    tag:'设计', date:'2026-09-28', read:'8 分钟',
    title:'像素艺术入门：如何用格子讲好一个故事',
    thumb:'grid',
    excerpt:'像素画不是"低分辨率照片"，而是用有限的格子做取舍。格子越少，每一个格子越要说清楚一件事。',
    body:[
      '很多人以为像素画就是把图画小了。错了。画一张 32x32 的脸，你要决定哪只眼睛用一个格子、眉梢要不要单独占一格。这种被迫的取舍，才是像素画的表达方式。',
      '练习从临摹开始，但不要临摹成品，去临摹"色块关系"：找一张你喜欢的像素图，先只画它的明暗两色，再看它如何用第三个颜色破掉沉闷。多数新手的毛病是颜色用得太少而不是太多。',
      '抖动（dithering）是老机器的智慧：两种颜色交错排列，在远处看像第三种颜色。它能让 8 色画面看起来有 16 色的层次，但别滥用，大面积的抖动在今天的高清屏上会显得脏。',
      '最后，给画面留一个"焦点格簇"。观众的眼睛会先停在信息最密集的地方，所以重要的角色身上，线条和颜色变化要最丰富。'
    ]
  },
  {
    tag:'图鉴', date:'2026-09-15', read:'5 分钟',
    title:'史莱姆的一百种用法（合法篇）',
    thumb:'slime',
    excerpt:'从照明到搬家，从净水到当枕头，异世界最被低估的魔物可能就是这团半透明的小东西。',
    body:[
      '照明：把史莱姆塞进掏空的葫芦，它吞下荧光苔藓后会整晚发微光，亮度刚好够看书，而且比火把安全——不会把你的帐篷也点了。',
      '净水：小型史莱姆过滤水中的杂质后会排出清水，一次处理约一升。注意只能过滤，不能消毒，喝之前还是煮一下。',
      '搬家：中型史莱姆可以吞下约自身体积三分之一的物品并保持完整。把行李交给它，你只需要牵着它走。务必系好绳，受惊的史莱姆跑得比马快。',
      '当枕头：加热后的史莱姆会变得又软又温，抱着睡觉很舒服。本条用法存在争议，公会道德委员会正在讨论史莱姆的睡觉权问题。'
    ]
  },
  {
    tag:'考察', date:'2026-08-30', read:'10 分钟',
    title:'魔王城建筑考察报告·第三版',
    thumb:'castle',
    excerpt:'为什么魔王城的楼梯总是通向死路？为什么大厅一定要挑高二十米？从建筑学角度，这些设计其实都有理由。',
    body:[
      '魔王城最常见的布局是"中央大厅加四座角塔"。这并非为了气派：中央大厅是魔力管线的交汇点，四座塔既是增幅器也是泄压阀。砍掉任何一座塔，整座城的防护结界就会出现扇形盲区。',
      '通向死路的楼梯多数不是陷阱，而是检修通道。早期魔王城用机械升降机运输物资，楼梯井是留给维修工的。后来升降机被魔法阵取代，通道废弃，就成了我们看到的"死路"。',
      '关于"大厅挑高二十米"：咏唱大型魔法需要垂直空间容纳回声，层高每增加一米，群体咏唱的稳定性提升约百分之三。魔王也是个讲究声学工程的甲方。',
      '本报告完。考察途中被保安魔像追赶两次，鞋丢了一只，照片像素偏低，敬请谅解。'
    ]
  }
];
(function renderArticles(){
  const thumbs = {
    camp:'<rect width="96" height="64" fill="#1a1030"/><rect x="0" y="48" width="96" height="16" fill="#2b1a12"/><rect x="18" y="34" width="26" height="14" fill="#8a4a2b"/><rect x="22" y="38" width="18" height="10" fill="#ff9a3d"/><rect x="30" y="26" width="6" height="12" fill="#6b4a2f"/><rect x="24" y="40" width="4" height="6" fill="#ffe9a8" class="flick"/><rect x="34" y="42" width="4" height="6" fill="#ffe9a8" class="flick d2"/><rect x="62" y="22" width="3" height="3" fill="#fff" class="twinkle"/><rect x="76" y="14" width="2" height="2" fill="#fff" class="twinkle d1"/>',
    grid:'<rect width="96" height="64" fill="#241a3d"/><rect x="10" y="10" width="12" height="12" fill="#b46cff"/><rect x="26" y="10" width="12" height="12" fill="#57e0ff"/><rect x="42" y="10" width="12" height="12" fill="#ffd23f"/><rect x="58" y="10" width="12" height="12" fill="#63e07a"/><rect x="10" y="26" width="12" height="12" fill="#ff5d7a"/><rect x="26" y="26" width="12" height="12" fill="#ff8a4d"/><rect x="42" y="26" width="12" height="12" fill="#c9d2e0"/><rect x="58" y="26" width="12" height="12" fill="#33206e"/><rect x="10" y="42" width="76" height="12" fill="#1d1244"/><rect x="16" y="45" width="20" height="6" fill="#57e0ff"/><rect x="42" y="45" width="38" height="6" fill="#33206e"/>',
    slime:'<rect width="96" height="64" fill="#10251a"/><rect x="0" y="52" width="96" height="12" fill="#1c3a28"/><rect x="28" y="18" width="40" height="6" fill="#63e07a"/><rect x="22" y="24" width="52" height="8" fill="#63e07a"/><rect x="18" y="32" width="60" height="14" fill="#63e07a"/><rect x="18" y="46" width="60" height="8" fill="#3cb371"/><rect x="22" y="54" width="52" height="4" fill="#3cb371"/><rect x="36" y="34" width="4" height="4" fill="#0d0821"/><rect x="56" y="34" width="4" height="4" fill="#0d0821"/><rect x="28" y="26" width="6" height="2" fill="#fff" opacity=".7"/>',
    castle:'<rect width="96" height="64" fill="#160b2e"/><rect x="10" y="30" width="18" height="24" fill="#181030"/><rect x="34" y="22" width="28" height="32" fill="#181030"/><rect x="68" y="30" width="18" height="24" fill="#181030"/><rect x="10" y="26" width="6" height="4" fill="#181030"/><rect x="24" y="26" width="6" height="4" fill="#181030"/><rect x="68" y="26" width="6" height="4" fill="#181030"/><rect x="80" y="26" width="6" height="4" fill="#181030"/><rect x="13" y="16" width="12" height="8" fill="#9c3a4d"/><rect x="70" y="16" width="12" height="8" fill="#9c3a4d"/><rect x="45" y="44" width="6" height="10" fill="#05030c"/><rect x="40" y="30" width="4" height="5" fill="#ffd23f" class="flick"/><rect x="52" y="30" width="4" height="5" fill="#ffd23f" class="flick d2"/><rect x="0" y="54" width="96" height="10" fill="#110826"/>'
  };
  $('#article-grid').innerHTML = ARTICLES.map((a, i) =>
    '<article class="article-card px-panel reveal" data-i="' + i + '" tabindex="0" role="button" aria-label="阅读文章：' + a.title + '">' +
      '<div class="thumb"><svg viewBox="0 0 96 64" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid slice">' + thumbs[a.thumb] + '</svg></div>' +
      '<div class="card-body">' +
        '<div class="card-meta"><span class="tag">' + a.tag + '</span><span class="date">' + a.date + '</span></div>' +
        '<h3>' + a.title + '</h3>' +
        '<p>' + a.excerpt + '</p>' +
        '<div class="card-foot"><span class="read">READ ' + a.read + '</span><span class="go">阅读 →</span></div>' +
      '</div>' +
    '</article>'
  ).join('');
  function open(i){
    const a = ARTICLES[i];
    $('#modal-tag').textContent = a.tag;
    $('#modal-date').textContent = a.date + ' · 全文 ' + a.read;
    $('#modal-title').textContent = a.title;
    $('#modal-body').innerHTML = a.body.map(p => '<p>' + p + '</p>').join('');
    $('#modal-mask').classList.add('show');
    $('#modal-close').focus();
  }
  $$('#article-grid .article-card').forEach(card => {
    card.addEventListener('click', () => open(+card.dataset.i));
    card.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(+card.dataset.i); } });
  });
  $('#modal-close').addEventListener('click', () => $('#modal-mask').classList.remove('show'));
  $('#modal-mask').addEventListener('click', e => { if(e.target === e.currentTarget) e.currentTarget.classList.remove('show'); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') $('#modal-mask').classList.remove('show'); });
})();

/* ================= 友链 ================= */
(function renderLinks(){
  const LINKS = [
    { t:'界', c:'t1', n:'小世界展厅', d:'气象之间、威龙的博客、雨夜便利店 三个交互小世界', u:'../spaces/spaces.html' },
    { t:'字', c:'t1', n:'像素字体研究所', d:'Zpix、Fusion Pixel 等位图字体的收录与试用' },
    { t:'色', c:'t2', n:'开放色彩图鉴', d:'按色相翻颜色的老实工具，支持导出调色板' },
    { t:'音', c:'t3', n:'8bit 音效库', d:'免费芯片音效，署名即可商用' },
    { t:'图', c:'t4', n:'异世界地图 Wiki', d:'大陆架、浮岛与龙巢的分布考察' },
    { t:'榜', c:'t5', n:'勇者工会公告板', d:'任务发布、悬赏结算与投诉受理' },
    { t:'坛', c:'t6', n:'史莱姆论坛', d:'魔物养成技术交流，禁止发布烹饪教程' }
  ];
  $('#link-grid').innerHTML = LINKS.map((l, i) =>
    '<a class="link-card px-panel reveal" href="' + (l.u || '#') + '" data-i="' + i + '" data-name="' + l.n + '">' +
      '<span class="link-tile ' + l.c + '">' + l.t + '</span>' +
      '<div><h3>' + l.n + '</h3><p>' + l.d + '</p><span class="go">访问 →</span></div>' +
    '</a>'
  ).join('');
  $$('#link-grid .link-card').forEach(a => {
    if(LINKS[+a.dataset.i].u) return;            // 配了真实地址 → 正常跳转，不走演示拦截
    a.addEventListener('click', e => {
      e.preventDefault();
      toast('演示链接：「' + a.dataset.name + '」正式版会跳到真实地址');
    });
  });
})();
