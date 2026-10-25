# 雨夜便利店 · 构建源

站点上的 `public/spaces/rainy-night-konbini.html`（约 534 KB）是**产物**，不是手写页面。
它由本目录的三个文件生成，产物里内联了整包 three.js，所以体积大但只有一个请求。

| 文件 | 作用 |
| --- | --- |
| `entry.mjs` | 场景源码：渲染器、雨、店内、街道、开门交互 |
| `template.html` | 页面外壳与覆盖层样式，脚本位置用 `//__BUNDLE__` 占位 |
| `build.mjs` | esbuild 打包 + 替换占位符 + 写出产物 |

## 重建

```bash
cd src/konbini
npm install          # 首次需要，会生成 node_modules（已被 gitignore）
node build.mjs
```

产物会直接写回 `public/spaces/rainy-night-konbini.html`，脚本会打印体积变化。

## 改场景时注意

- three.js 版本影响光照与材质。本仓库没有锁定版本（原始构建用的版本已无从考证），
  重建后请把产物和线上版本对比一眼，确认色调没跑偏。
- `entry.mjs` 里用的是 `three/examples/jsm/...` 旧路径。若升级到较新版本的 three，
  可能要改成 `three/addons/...`。
- 打包结果里如果出现 `</script>`，`build.mjs` 会自动转义成 `<\/script>`，否则会
  提前闭合内联脚本、整页白屏。改 `build.mjs` 时别把这行删了。
