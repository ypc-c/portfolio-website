# YPC-C · 个人作品集

一个零构建的静态站点：写完 HTML 推送到 `main`，Cloudflare Pages 自动发布。
没有打包器、没有依赖、没有构建步骤——这是刻意的选择。

- 线上地址：<https://ypc-website.pages.dev>
- 仓库：`ypc-c/ypc-website`

## 仓库根 ≠ 站点根

站点根是 **`public/`**，Cloudflare Pages 的输出目录指向它。仓库根只放三样东西：
站点目录本身、构建源（`src/`）、本地工具（`tools/`）。

这样非站点文件不会被发布出去，也不用靠 `.` 开头的目录名去绕开上传。

> 如果你改动了这条分层，记得同步把 Pages 的 **Build output directory** 从 `.` 改成 `public`，
> 否则新部署会找不到 `index.html`，全站 404。

## 目录结构

```
.
├─ public/                       ← 站点根，线上可见的只有这里
│  ├─ index.html                首页：作品 / 关于我 / 联系我
│  ├─ styles.css                首页样式
│  ├─ 404.html
│  ├─ robots.txt
│  ├─ _headers                  Pages 响应头（缓存策略）
│  ├─ _redirects                Pages 重定向（旧路径兼容）
│  ├─ assets/                   全站共享资源（唯一资产根）
│  │  ├─ css/                   fonts（@font-face 唯一声明）、option-wheel
│  │  ├─ js/                    warp-tunnel、option-wheel
│  │  ├─ fonts/                 ArkPixel 像素字体
│  │  └─ img/                   qq 图标等
│  ├─ pixel-world/              异世界（像素风）门户
│  │  ├─ index.html             游戏厅 / 文章 / 网页 / 留言栏
│  │  ├─ img/                   本区专属壁纸
│  │  └─ games/                 三个小游戏，各自单文件内联样式与脚本
│  └─ spaces/                   小世界展厅
│     ├─ spaces.html            轮盘导航（切换下方三个场景）
│     ├─ weather-cards.html     气象之间
│     ├─ rainy-night-konbini.html  雨夜便利店（构建产物，见 src/konbini）
│     └─ wl-blog/               wl 的博客
├─ functions/                   Pages Functions，必须留在仓库根级
│  └─ api/
│     ├─ visit.js               访客统计 GET /api/visit
│     └─ guestbook.js           留言板 GET/POST /api/guestbook
├─ src/                         构建源，不参与发布
│  └─ konbini/                  雨夜便利店的场景源码与构建脚本
├─ tools/
│  └─ check-links.py            本地引用完整性检查
└─ README.md
```

## 页面导航

```
public/index.html（默语 · 主页）
   └─「进入异世界」→ pixel-world/
                        └─「小世界展厅」→ spaces/spaces.html
                                            └─ 轮盘切换三个场景
```

两条返回路径：`spaces.html` 的「← 返回异世界」回 `pixel-world/`，
`pixel-world` 导航最左的「回到原世界」回 `index.html`。

## 本地预览

必须起 HTTP 服务，直接双击 `index.html` 会因跨目录相对路径取不到资源而挂
（轮盘、字体、iframe 场景都是如此）：

```bash
python -m http.server 8123 --directory public
# 打开 http://127.0.0.1:8123
```

用 `127.0.0.1` 而不是 `localhost`。本机若开了全局代理，浏览器访问 `localhost`
可能被代理截走，拿到莫名其妙的 404 或 502——这两个报错和站点本身无关。

## 改动后自检

```bash
python tools/check-links.py
```

扫描 `public/` 里所有 HTML 与 CSS，把 `src` / `href` / `url()` 的本地路径解析成
真实文件路径并检查是否存在。改目录名、移动资源之后跑一下，比手动点页面可靠。

## 部署配置（Cloudflare Pages）

| 字段 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | 留空 |
| Build output directory | `public` |
| Root directory | 留空 |

仓库根没有 `package.json`（`src/konbini/package.json` 在子目录，Pages 不会读它），
所以 Pages 不执行安装或构建，直接把 `public/` 当静态站发布。

`functions/` 必须留在仓库根级，Pages 只认这个位置。

### KV 绑定

两个接口共用一个 KV 命名空间：

| 绑定变量名 | 用途 |
| --- | --- |
| `VISITOR_KV` | 访客计数、留言板存储 |

未绑定 KV 时接口返回 `configured:false`，页面计数显示 `—`，其余功能正常降级。

## 雨夜便利店需要单独构建

`public/spaces/rainy-night-konbini.html` 是产物，源码在 `src/konbini/`。
场景改动后要重新构建，否则改了源码线上不会变：

```bash
cd src/konbini && npm install && node build.mjs
```

细节见 `src/konbini/README.md`。

## 目录约定

- 目录与文件名一律 **kebab-case**，不含空格（URL 里空格要编码成 `%20`，脚本和 CI 都要跟着转义）。
- 跨页复用的资源放 `public/assets/`；只有单个页面用的图片留在该页面自己的目录。
- 新增页面时优先抽独立 `.css` / `.js` 文件，而不是继续往 HTML 里堆 `<style>`。
- 页面之间的相对路径按所在目录写，不要写死域名。
- 非站点文件（源码、脚本、文档）不要放进 `public/`，放仓库根。

## 刻意不做的事

- **不引入打包器。** 零构建、push 即发布是这个站最大的优势，为了"结构整洁"上一个构建链是负收益。
- **不共享游戏页样式。** `public/pixel-world/games/` 下三个游戏是小应用，各自内联样式与脚本
  （单请求加载、首屏更快）。它们的按钮和 HUD 看着相似但会各自演进，抽成公共样式后改一个就牵动
  另外两个，耦合成本高于重复成本。只共享 `@font-face`——因为字体路径带跨层级 `../`，散着写最容易改漏。

## 已知待办

- [ ] favicon 与 `apple-touch-icon`（现在只有内联 SVG data URI）
- [ ] 开放图谱（OG）图片与 meta，分享到社交平台时目前只有纯文本标题
