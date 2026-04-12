/**
 * Мініфікація CSS і JS для production (PageSpeed).
 * PurgeCSS видаляє невикористаний CSS (~2 КіБ економії для Lighthouse).
 * Запуск: npm run build | На Render: npm run build
 */
const fs = require('fs');
const path = require('path');

async function build() {
  // Мініфікація JS (terser)
  let terser;
  try {
    terser = require('terser');
  } catch (e) {
    console.warn('terser не встановлено. Запустіть: npm install --save-dev terser');
    return;
  }
  const jsPath = path.join(__dirname, 'js', 'main.js');
  const jsOutPath = path.join(__dirname, 'js', 'main.min.js');
  const jsCode = fs.readFileSync(jsPath, 'utf8');
  const jsResult = await terser.minify(jsCode, {
    compress: { drop_console: false, passes: 2 },
    mangle: false,
    format: { comments: false }
  });
  if (jsResult.error) throw jsResult.error;
  fs.writeFileSync(jsOutPath, jsResult.code);
  console.log('js/main.min.js');

  const cssPath = path.join(__dirname, 'css', 'styles.css');
  const cssOutPath = path.join(__dirname, 'css', 'styles.min.css');
  let cssCode = fs.readFileSync(cssPath, 'utf8');

  // Видалення невикористаного CSS (PurgeCSS) — економія ~2 КіБ для Lighthouse
  let PurgeCSS;
  try {
    PurgeCSS = require('purgecss').PurgeCSS;
  } catch (e) {
    console.warn('purgecss не встановлено — пропускаємо purge. npm install --save-dev purgecss');
  }
  if (PurgeCSS) {
    const htmlPaths = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join(__dirname, f));
    const content = [
      ...htmlPaths,
      path.join(__dirname, 'js', 'main.js')
    ].filter((f) => fs.existsSync(f));
    const purgeResult = await new PurgeCSS().purge({
      content: content.map((f) => ({ raw: fs.readFileSync(f, 'utf8'), extension: path.extname(f).slice(1) })),
      css: [{ raw: cssCode }],
      safelist: [
        'is-active', 'is-closed', 'modal-open', 'toast',
        /^modal-/, /^checkout-/, /^order-item/, /^product-/, /^reviews-/, /checkout-form-view--no-cart/
      ]
    });
    if (purgeResult[0] && purgeResult[0].css) cssCode = purgeResult[0].css;
    console.log('css purged');
  }

  // Мініфікація CSS (clean-css)
  let CleanCSS;
  try {
    CleanCSS = require('clean-css');
  } catch (e) {
    console.warn('clean-css не встановлено. Запустіть: npm install --save-dev clean-css');
    return;
  }
  const cssResult = new CleanCSS({
    level: 2,
    format: { breaks: false }
  }).minify(cssCode);
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('; '));
  fs.writeFileSync(cssOutPath, cssResult.styles);
  console.log('css/styles.min.css');

  // Копируем статику в папку public/ — так Vercel будет отдавать CSS/JS
  // (и попутно API routes в папке api/ останутся функциями).
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
  fs.mkdirSync(publicDir, { recursive: true });

  // Копируем все *.html из корня проекта
  const htmlFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.html'));
  htmlFiles.forEach((f) => {
    fs.cpSync(path.join(__dirname, f), path.join(publicDir, f));
  });

  // Копируем папки со статикой
  ['css', 'js', 'assets'].forEach((dir) => {
    const src = path.join(__dirname, dir);
    const dst = path.join(publicDir, dir);
    if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
  });

  // Генерируем WebP из PNG/JPG (если установлен sharp)
  // JS будет пытаться грузить .webp и откатываться на оригинал по onerror.
  try {
    const sharp = require('sharp');
    const assetsDir = path.join(publicDir, 'assets');

    async function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        const lower = entry.name.toLowerCase();
        const isJpeg = lower.endsWith('.jpg') || lower.endsWith('.jpeg');
        const isPng = lower.endsWith('.png');
        if (!isJpeg && !isPng) continue;

        const outPath = fullPath.replace(/\.(png|jpe?g)$/i, '.webp');
        if (fs.existsSync(outPath)) continue;

        await sharp(fullPath)
          .webp({ quality: 82 })
          .toFile(outPath);
      }
    }

    if (fs.existsSync(assetsDir)) {
      await walk(assetsDir);
    }
    const rootAssetsDir = path.join(__dirname, 'assets');
    if (fs.existsSync(rootAssetsDir)) {
      await walk(rootAssetsDir);
    }
    console.log('webp generated');
  } catch (e) {
    console.warn('sharp не встановлено або webp генерація пропущена:', e && e.message ? e.message : e);
  }

  console.log('public/ ready');

  console.log('Build done.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
