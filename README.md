<div align="center">

# 默语 · YPC-C 个人作品集

**用代码创造价值 · 一个零构建的静态站点，写完就推送**

[访问站点](https://ypc-website.pages.dev) · [GitHub 仓库](https://github.com/ypc-c/ypc-website) · [反馈问题](https://github.com/ypc-c/ypc-website/issues)

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-托管-F6821F?logo=cloudflarepages&logoColor=white)](https://ypc-website.pages.dev) [![JavaScript](https://img.shields.io/badge/JavaScript-原生-323330?logo=javascript&logoColor=F7DF1E)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript) [![HTML5](https://img.shields.io/badge/HTML5-语义化-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/zh-CN/docs/Web/HTML) [![CSS](https://img.shields.io/badge/CSS-原生-1572B6?logo=css&logoColor=white)](https://developer.mozilla.org/zh-CN/docs/Web/CSS) [![Three.js](https://img.shields.io/badge/Three.js-3D%20场景-000000?logo=threedotjs&logoColor=white)](https://threejs.org/) [![WebGL2](https://img.shields.io/badge/WebGL2-穿梭转场-990000?logo=webgl&logoColor=white)](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API) [![Pages Functions](https://img.shields.io/badge/Pages%20Functions-KV-F6821F?logo=cloudflareworkers&logoColor=white)](https://developers.cloudflare.com/pages/functions/) [![License](https://img.shields.io/badge/license-MIT-97CA00?logo=opensourceinitiative&logoColor=white)](./LICENSE)

[项目简介](#项目简介) · [功能一览](#功能一览) · [技术组成](#技术组成) · [本地预览](#本地预览) · [站点结构](#站点结构) · [部署配置](#部署配置) · [目录约定](#目录约定)

</div>

## 项目简介

「默语」是 YPC-C 的个人作品集站点，线上地址 [ypc-website.pages.dev](https://ypc-website.pages.dev)。
主页放作品、关于我和联系方式；往里走还有一个像素风的「异世界」，以及挂在异世界深处的小世界展厅。

这是一个**刻意零构建**的站点：没有打包器、没有运行时依赖、没有构建步骤。写完 HTML / CSS / JS 推到 `main`，Cloudflare Pages 直接发布。想改一行文案就改一行文案，不用等编译，也不用担心依赖漂移。

全站只有一处需要构建——雨夜便利店的 three.js 场景，它在仓库里保留源码并单独打包，产物提交回站点目录。

## 功能一览

**🏠 主页 · 作品集**
四个项目卡片（优惠券秒杀系统、智能预约挂号助手、待办清单小程序、浮窗文字提取小程序）、关于我、联系方式。顶部有中英双语切换，「关于我」里挂着实时访客统计。

**🌌 异世界 · PIXEL WORLD**
点「进入异世界」会先走一段 WebGL2 光缆隧道转场，落地后是像素风门户：游戏厅、文章、网页、留言栏四个区块，自带主题切换与背景音乐。

**🕹️ 游戏厅**
星屑大作战（内嵌在门户页画布里）、像素射击 Pixel Attack、像素小集市 Pixel Market、暖阳农场 Sunny Farm。

**📮 留言栏**
填邮箱和勇者名号就能留言，服务端落在 Cloudflare KV 里，每天最多 10 条、凌晨 5 点自动清空；接口不可用时自动降级为浏览器本地存储，页面照常能写。

**🛸 小世界展厅**
侧边一个文字轮盘切换三个场景：气象之间、wl 的博客、雨夜便利店。便利店是 three.js 做的 3D 场景，离开视口会自动暂停渲染，不占后台算力。

## 技术组成

| 部分 | 用途 |
| --- | --- |
| 原生 HTML / CSS / JavaScript | 全部页面，无框架、无打包器 |
| WebGL2（手写着色器） | 首页到异世界的光缆隧道转场 |
| Three.js 0.186 | 雨夜便利店 3D 场景，esbuild 打成单文件产物 |
| Cloudflare Pages | 静态托管与自动部署 |
| Pages Functions + KV | 访客统计、留言板两个后端接口 |
| ArkPixel / Press Start 2P | 像素字体，本地托管不走外部 CDN |

## 本地预览

必须起 HTTP 服务。直接双击 `index.html` 会因为跨目录相对路径取不到资源而挂掉（轮盘、字体、iframe 场景都是如此）：

```bash
python -m http.server 8123 --directory public
# 打开 http://127.0.0.1:8123
```

用 `127.0.0.1` 而不是 `localhost`。本机若开了全局代理，浏览器访问 `localhost` 可能被代理截走，拿到莫名其妙的 404 或 502——这两个报错和站点本身无关。

改完目录名或移动资源后，跑一下引用完整性检查（扫描 `public/` 下 HTML 与 CSS 的 `src` / `href` / `url()` 本地路径是否真实存在）：

```bash
python tools/check-links.py
```

## 站点结构

站点根是 **`public/`**，Cloudflare Pages 的输出目录指向它。仓库根只放站点目录本身、构建源（`src/`）和本地工具（`tools/`）——这样非站点文件不会被发布出去。

```
.
├─ public/                       ← 站点根，线上可见的只有这里
│  ├─ index.html                 主页：作品 / 关于我 / 联系我
│  ├─ styles.css                 主页样式
│  ├─ 404.html · robots.txt
│  ├─ favicon.ico                内含 16 / 32 / 48 三个尺寸
│  ├─ favicon-32.png             不支持 SVG favicon 的老浏览器兜底
│  ├─ apple-touch-icon.png       iOS「添加到主屏幕」，180×180
│  ├─ _headers                   Pages 响应头（缓存策略）
│  ├─ _redirects                 Pages 重定向（旧路径兼容）
│  ├─ assets/                    全站共享资源（唯一资产根）
│  │  ├─ css/                    fonts（@font-face 唯一声明）、option-wheel
│  │  ├─ js/                     warp-tunnel、option-wheel
│  │  ├─ fonts/                  ArkPixel + Press Start 2P（woff2）
│  │  └─ img/                    OG 分享图、QQ 图标
│  ├─ pixel-world/               异世界门户
│  │  ├─ index.html              页面骨架：导航 / HERO / 四个 section / 页脚 / 弹窗
│  │  ├─ css/                    本页样式，五个文件按层叠顺序串联
│  │  │  ├─ base.css             字体与主题变量（紫夜/翠影/熔岩/冰蕊 + 白昼）、重置、像素组件
│  │  │  ├─ layout.css           顶部导航、HERO 场景与壁纸、章节标题
│  │  │  ├─ sections.css         游戏厅 / 文章 / 友链 / 留言栏 / 主题面板 / 页脚 / 弹窗
│  │  │  ├─ effects.css          CRT 扫描线、场景动画、入场动效
│  │  │  └─ responsive.css       全部 @media（窄屏适配、减少动态）
│  │  ├─ js/                     本页脚本，七个文件按依赖顺序加载
│  │  │  ├─ core.js              $ / $$ / store / toast + 星空与萤火虫（必须最先加载）
│  │  │  ├─ pixel-trail.js       像素鼠标拖尾（WebGL2）
│  │  │  ├─ theme.js             主题、亮暗、壁纸选择
│  │  │  ├─ chiptune.js          8-bit 音乐合成与音乐按钮
│  │  │  ├─ content.js           文章数据与渲染、友链渲染
│  │  │  ├─ guestbook.js         留言栏（/api/guestbook + localStorage 降级）
│  │  │  └─ ui.js                导航收起/高亮、入场动画、HERO 视差
│  │  ├─ img/                    本区专属壁纸与配图
│  │  └─ games/                  五个小游戏，各自单文件内联样式与脚本
│  │     └─ kenney_tiny-farm/ · kenney_tiny-town/   tiny-realm 用的瓦片素材（CC0）
│  └─ spaces/                    小世界展厅
│     ├─ spaces.html             轮盘导航（切换下方三个场景）
│     ├─ weather-cards.html      气象之间
│     ├─ rainy-night-konbini.html  雨夜便利店（构建产物，见 src/konbini）
│     └─ wl-blog/                wl 的博客
├─ functions/                    Pages Functions，必须留在仓库根级
│  └─ api/
│     ├─ visit.js                访客统计 GET /api/visit
│     └─ guestbook.js            留言板 GET / POST /api/guestbook
├─ src/                          构建源，不参与发布
│  └─ konbini/                   雨夜便利店的场景源码与构建脚本
├─ tools/
│  └─ check-links.py             本地引用完整性检查
├─ LICENSE                       MIT
└─ README.md
```

### 页面之间的路

```
public/index.html（默语 · 主页）
   └─「进入异世界」→ pixel-world/
                        └─「小世界展厅」→ spaces/spaces.html
                                            └─ 轮盘切换三个场景
```

两条返回路径：`spaces.html` 的「← 返回异世界」回 `pixel-world/`，
`pixel-world` 导航最左的「回到原世界」回 `index.html`。

## 部署配置（Cloudflare Pages）

| 字段 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | 留空 |
| Build output directory | `public` |
| Root directory | 留空 |

> 如果你改动了这条分层，记得同步把 Pages 的 **Build output directory** 从 `.` 改成 `public`，否则新部署会找不到 `index.html`，全站 404。

`functions/` 必须留在仓库根级，Pages 只认这个位置。

### KV 绑定

两个接口共用一个 KV 命名空间：

| 绑定变量名 | 用途 |
| --- | --- |
| `VISITOR_KV` | 访客计数、留言板存储 |

未绑定 KV 时接口返回 `configured:false`，页面计数显示 `—`，其余功能正常降级。

### 雨夜便利店需要单独构建

`public/spaces/rainy-night-konbini.html` 是产物，源码在 `src/konbini/`。场景改动后要重新构建，否则改了源码线上不会变：

```bash
cd src/konbini && npm install && node build.mjs
```

细节见 `src/konbini/README.md`。

## 目录约定

- 目录与文件名一律 **kebab-case**，不含空格（URL 里空格要编码成 `%20`，脚本和 CI 都要跟着转义）。
- 跨页复用的资源放 `public/assets/`；只有单个页面用的图片留在该页面自己的目录。
- 新增页面时优先抽独立 `.css` / `.js` 文件，而不是继续往 HTML 里堆 `<style>`。
- 单页要拆文件时，在该页目录下建 `css/` 与 `js/`，**文件名即职责**（见 `pixel-world/`）。两个硬约束：
  - CSS 的 `<link>` 顺序必须保持层叠顺序（base → layout → sections → effects → responsive），后加规则往对应文件里放，别改成"哪里顺手放哪里"。
  - JS 是普通 `<script>` 而非模块，靠加载顺序共享全局符号；`core.js`（`$` / `$$` / `store` / `toast`）必须最先加载，其余文件都依赖它。新增功能单独建文件、插在 `core.js` 之后即可。
  - 拆出 CSS 文件后，**样式表里的相对图片路径要跟着改**（`img/x.webp` → `../img/x.webp`）；另外别用「自定义属性里塞 `url()`」这种做法——`var()` 代入的 `url()` 会按样式表路径解析，内联时正常、拆文件后变 404（本页壁纸踩过，现改为 `<html data-wall>` 切换）。
- 页面之间的相对路径按所在目录写，不要写死域名。
- 非站点文件（源码、脚本、文档）不要放进 `public/`，放仓库根。

## 刻意不做的事

- **不引入打包器。** 零构建、push 即发布是这个站最大的优势，为了“结构整洁”上一个构建链是负收益。
- **不共享游戏页样式。** `public/pixel-world/games/` 下的小游戏是小应用，各自内联样式与脚本（单请求加载、首屏更快）。它们的按钮和 HUD 看着相似但会各自演进，抽成公共样式后改一个就牵动其他几个，耦合成本高于重复成本。只共享 `@font-face`——因为字体路径带跨层级 `../`，散着写最容易改漏。
- **不把异世界首页的 HERO 内联 SVG 抽成外部文件。** 它靠 `style="stop-color:var(--sky-a)"` 继承主题变量、且 `#stars` / `.shoot` / `.cloud` 要被 JS 与 CSS 动画直接操作，改成 `<img>` 或异步插入会丢主题联动、首屏也会闪。

### OG 分享图怎么重新生成

首页 OG 图由 `tools/og-home.html` 导出：那是一个 1200×630 的定尺模板页（不参与发布），
改完文案后用 Edge 无头截图导出：

```bash
msedge --headless=new --disable-gpu --hide-scrollbars --no-proxy-server \
  --window-size=1200,630 --virtual-time-budget=3000 \
  --screenshot=og-home.png tools/og-home.html
```

几个注意点：`--no-proxy-server` 不能省（本机开了全局代理，否则连本地文件都会被代理截走）；
老 `--headless` 已不可用，必须 `--headless=new`。文字为主的设计导出 PNG 比 JPG 更小也更锐
（当前 31 KB）。异世界页的 OG 图同理，`og:image` 必须是**绝对 URL**，抓取器不认相对路径。

## 已知待办

- [ ] 给 pixel-world 做一个专属 `apple-touch-icon`（紫色传送门），目前 iOS 加到主屏会回落到站点根的蓝色图标

## 版权与许可

站点源码以 **MIT License** 发布，Copyright (c) 2026 YPC-C，见 [LICENSE](./LICENSE)。
页面文案、像素素材与 3D 场景均为原创，同样适用该许可。

仓库中的第三方组件遵循各自的许可，**不受本仓库的 MIT 覆盖**：

| 组件 | 许可 |
| --- | --- |
| Three.js | MIT |
| ArkPixel 方舟像素字体（TakWolf） | SIL Open Font License 1.1 |
| Press Start 2P | SIL Open Font License 1.1 |
