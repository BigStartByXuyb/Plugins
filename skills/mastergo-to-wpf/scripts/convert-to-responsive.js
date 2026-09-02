#!/usr/bin/env node
// 把绝对定位的静态 HTML（MasterGo 直出版）机械转换为按比例自适应的响应式版本。
// 原理等价于 WPF Grid 加权星号：所有定位 px 换算为相对父级设计尺寸的百分比。
// 字号保持固定 px；指定的"固定厚度类"（如分隔线/勾选框）只保留尺寸 px，位置仍转 %。
//
// 用法:
//   node convert-to-responsive.js <input.html> <output.html> <stageW> <stageH> [选项]
// 选项:
//   --keep-px-classes chk                这些 class 的元素：width/height 都保持 px，位置转 %（勾选框等小交互件）
//   --keep-thickness divider             这些 class 的元素：仅 width(厚度)保持 px，位置/长度转 %（细线/分隔条）
//   --class-rules ".fcard .flabel:180:180,.hcard .hlabel:100:100"
//                                        类级 CSS 规则中的定位 px 也转换（给出该规则相对的设计宽:高）
//   --class-sizes "fcard:180:180"        尺寸写在 class 而非内联 style 的元素（供其子元素换算父级尺寸）
//
// 依赖: npm i cheerio
const fs = require('fs');
const cheerio = require('cheerio');

const [,, SRC, OUT, W, H, ...rest] = process.argv;
if (!SRC || !OUT || !W || !H) { console.error('参数不足，见文件头注释'); process.exit(1); }
const STAGE_W = +W, STAGE_H = +H;

function parseKV(flag) {
  const i = rest.indexOf(flag);
  if (i < 0) return [];
  return rest[i + 1].split(',').filter(Boolean).map(s => s.split(':'));
}
const KEEP_PX = new Set(parseKV('--keep-px-classes').flat());
const KEEP_THICK = new Set(parseKV('--keep-thickness').flat());
const CSS_RULES = parseKV('--class-rules');      // [selector, pw, ph]
const CLASS_SIZES = Object.fromEntries(parseKV('--class-sizes').map(([c, w, h]) => [c, { w: +w, h: +h }]));

// (?<![\w-]) 关键：防止把 line-height 里的 "height" 误匹配
function convertPxInText(text, pw, ph, keepProps) {
  return text.replace(/(?<![\w-])(left|top|right|bottom|width|height)\s*:\s*(-?[\d.]+)px/g,
    (m, prop, v) => {
      if (keepProps && keepProps.has(prop)) return m;
      const base = (prop === 'left' || prop === 'right' || prop === 'width') ? pw : ph;
      return `${prop}:${(parseFloat(v) / base * 100).toFixed(4)}%`;
    });
}

const $ = cheerio.load(fs.readFileSync(SRC, 'utf8'), { decodeEntities: false });

// 1. 布局层：stage 铺满容器；body 保留原有的字体/背景，只改布局属性
let css = $('style').html();
css = css.replace(/body\{([^}]*)\}/, (m, body) => {
  const keep = (body.match(/(?:font-family|background|color)\s*:[^;]+;?/g) || []).join('');
  return `html,body{height:100%;}body{margin:0;${keep}}`;
});
let stageReplaced = false;
css = css.replace(/\.stage\{[^}]*\}/, b => { stageReplaced = true; return b.replace(/(?<![\w-])width\s*:\s*[\d.]+px/, 'width:100%').replace(/(?<![\w-])height\s*:\s*[\d.]+px/, 'height:100%'); });
if (!stageReplaced) console.warn('警告: 未找到 .stage 规则，请手工确认根容器铺满');

// 2. 类级 CSS 规则中的定位 px -> %
for (const [sel, pw, ph] of CSS_RULES) {
  const re = new RegExp(`(${sel.replace(/[.*]/g, c => '\\' + c)}\\{[^}]*\\})`, 'g');
  css = css.replace(re, block => convertPxInText(block, +pw, +ph));
}
$('style').text(css);

// 3. 内联 style px -> %（相对父级设计尺寸；文档顺序保证父先于子处理）
const sizes = new Map();
const stageEl = $('.stage')[0];
if (!stageEl) { console.error('未找到 .stage 元素'); process.exit(1); }
sizes.set(stageEl, { w: STAGE_W, h: STAGE_H });

$('.stage').find('*').each((_, el) => {
  const $el = $(el);
  const parentSize = sizes.get(el.parent) || { w: STAGE_W, h: STAGE_H };
  const style = $el.attr('style') || '';
  const cls = $el.attr('class') || '';
  // 先记录自身设计尺寸（供子元素换算），再转换
  const wm = /(?<![\w-])width\s*:\s*([\d.]+)px/.exec(style);
  const hm = /(?<![\w-])height\s*:\s*([\d.]+)px/.exec(style);
  if (wm && hm) sizes.set(el, { w: parseFloat(wm[1]), h: parseFloat(hm[1]) });
  else for (const c of cls.split(/\s+/)) if (CLASS_SIZES[c]) { sizes.set(el, CLASS_SIZES[c]); break; }

  if (!style) return;
  const classes = cls.split(/\s+/);
  const inThick = KEEP_THICK.size && (classes.some(c => KEEP_THICK.has(c)) || $el.closest([...KEEP_THICK].map(c => '.' + c).join(',')).length > 0);
  const isKeep = KEEP_PX.size && (classes.some(c => KEEP_PX.has(c)) || $el.closest([...KEEP_PX].map(c => '.' + c).join(',')).length > 0);
  if (inThick) $el.attr('style', convertPxInText(style, parentSize.w, parentSize.h, new Set(['width'])));
  else if (isKeep) $el.attr('style', convertPxInText(style, parentSize.w, parentSize.h, new Set(['width', 'height'])));
  else $el.attr('style', convertPxInText(style, parentSize.w, parentSize.h));
});

fs.writeFileSync(OUT, $.html(), 'utf8');

// 4. 自检：剩余定位 px 应只出现在 keep-px 类和 font/border-radius 等处
const out = fs.readFileSync(OUT, 'utf8');
const leftover = out.match(/(?<![\w-])(?:left|top|right|bottom|width|height)\s*:\s*-?[\d.]+px/g) || [];
console.log('OK ->', OUT);
console.log('剩余定位 px 值数量（应在 keep-px 类中）:', leftover.length, '| SVG 数量:', (out.match(/<svg/g) || []).length);
