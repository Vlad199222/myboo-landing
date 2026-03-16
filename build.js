/**
 * Мініфікація CSS і JS для production (PageSpeed).
 * Запуск: npm run build
 * На Render у Build Command додайте: npm run build
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

  // Мініфікація CSS (clean-css)
  let CleanCSS;
  try {
    CleanCSS = require('clean-css');
  } catch (e) {
    console.warn('clean-css не встановлено. Запустіть: npm install --save-dev clean-css');
    return;
  }
  const cssPath = path.join(__dirname, 'css', 'styles.css');
  const cssOutPath = path.join(__dirname, 'css', 'styles.min.css');
  const cssCode = fs.readFileSync(cssPath, 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(cssCode);
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('; '));
  fs.writeFileSync(cssOutPath, cssResult.styles);
  console.log('css/styles.min.css');

  console.log('Build done.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
