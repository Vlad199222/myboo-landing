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
    compress: { drop_console: false },
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
    const content = [
      path.join(__dirname, 'index.html'),
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

  console.log('Build done.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
