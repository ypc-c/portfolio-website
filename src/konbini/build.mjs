// 雨夜便利店（Rainy Night Konbini）构建脚本
//
// 做三件事：
//   1. 用 esbuild 把 entry.mjs 连同 three.js 打包成单个 IIFE
//   2. 读 template.html，把 //__BUNDLE__ 占位符替换成打包结果
//   3. 写出 public/spaces/rainy-night-konbini.html（站点里那个 534K 的单文件）
//
// 用法：
//   cd src/konbini && npm install && node build.mjs
//
// 注意：three.js 版本会显著影响光照与材质表现。重建后请打开产物与线上版本
// 目视比对。本仓库未锁定 three 版本，因为原始构建用的版本没有记录在案。

import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const templatePath = path.join(here, 'template.html');
const entryPath = path.join(here, 'entry.mjs');
const outPath = path.join(repoRoot, 'public/spaces/rainy-night-konbini.html');

const PLACEHOLDER = '//__BUNDLE__';

async function main() {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    console.error('缺少 esbuild。请先在 src/konbini 下执行：npm install');
    process.exit(1);
  }

  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
  });

  const bundle = result.outputFiles[0].text;

  // 打包结果里可能出现 `</script>`，会提前闭合内联脚本，必须转义
  const safeBundle = bundle.replace(/<\/script>/gi, '<\\/script>');

  const template = await readFile(templatePath, 'utf8');
  if (!template.includes(PLACEHOLDER)) {
    console.error(`template.html 里找不到占位符 ${PLACEHOLDER}`);
    process.exit(1);
  }

  const html = template.replace(PLACEHOLDER, () => safeBundle);

  let before = 0;
  try {
    before = (await stat(outPath)).size;
  } catch {
    // 首次构建，产物还不存在
  }

  await writeFile(outPath, html, 'utf8');

  const after = (await stat(outPath)).size;
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`已生成 ${path.relative(repoRoot, outPath)}`);
  console.log(`  体积 ${kb(before)} -> ${kb(after)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
