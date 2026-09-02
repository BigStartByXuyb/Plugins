#!/usr/bin/env node
// MasterGo extractSvg 导出 JSON → WPF Icons.xaml 生成器（通用版）
// 用法: node gen-icons-xaml.js <extractSvg.json> <输出Icons.xaml>
//
// 每次转换时只需改本文件的 ICON_MAP（svgShortKey → extractSvg 条目 + 资源键 + LAYER 补丁）。
// 内置规则（手动转 SVG 最容易踩的坑）:
//  - rgba(r,g,b,a) → #AARRGGBB: 只有 alpha 乘 255, RGB 直接转（RGB 也乘 255 会得到 8 位色值）
//  - SVG 默认 fill-rule=nonzero, WPF PathGeometry 默认 EvenOdd → 显式 FillRule="Nonzero"
//  - svg transform="matrix(a,b,c,d,e,f)" → MatrixTransform（分量顺序一致）
//  - viewBox 非零原点 → Canvas.RenderTransform TranslateTransform 归零
//  - 每个 Viewbox 加 x:Shared="False"（UIElement 默认共享会报"已是另一个元素的逻辑子级"）
//  - composite SVG 不含 LAYER 矩形 → 用 ICON_MAP 的 layers 补丁补 <Rectangle>
const fs = require('fs');
const path = require('path');

const [, , srcFile, outFile] = process.argv;
if (!srcFile || !outFile) { console.error('用法: node gen-icons-xaml.js <extractSvg.json> <out.xaml>'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
const byLastId = new Map(data.svgs.map(s => [s.id.split('/').pop(), s]));

// ===== 每稿必改: svgShortKey → { lastId: extractSvg 条目的 id 尾段(=svgKey 字符串倒数第二段), key: 资源键, layers?: 缺失 LAYER 矩形补丁 } =====
const ICON_MAP = [
  // { short: 'S5#0', lastId: '8:0102', key: 'Icon_Auto', layers: [{ x: 3, y: 3, w: 45, h: 61, fill: '#F4F9FF' }] },
];
// ============================================================================================================================

function findEntry(lastId) {
  const e = byLastId.get(lastId);
  if (!e) throw new Error('extractSvg 中未找到节点 id 尾部 ' + lastId);
  return e;
}

function rgbaToHex(m) {
  const r = +m[1], g = +m[2], b = +m[3], a = +m[4];
  const h8 = n => Math.min(255, Math.round(n)).toString(16).padStart(2, '0').toUpperCase();
  const hA = n => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();
  return '#' + hA(a) + h8(r) + h8(g) + h8(b); // 注意: 只有 a 乘 255
}
function normFill(f) {
  if (!f) return null;
  f = f.trim();
  const m = f.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (m) return rgbaToHex(m);
  if (f === 'none' || f === 'transparent') return null;
  return f;
}
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function parseSvg(svg, indent) {
  const vb = svg.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error('svg 无 viewBox');
  const [ox, oy, w, h] = vb[1].split(/\s+/).map(Number);
  const out = [];
  const pathRe = /<path\s+d="([^"]*)"([^>]*?)\/?>/g;
  let m;
  while ((m = pathRe.exec(svg))) {
    const d = m[1];
    const attrs = m[2];
    const fill = normFill((attrs.match(/fill="([^"]+)"/) || [])[1]);
    const fillRule = (attrs.match(/fill-rule="([^"]+)"/) || [])[1];
    const tf = (attrs.match(/transform="matrix\(([^)]+)\)"/) || [])[1];
    const fr = fillRule === 'evenodd' ? 'EvenOdd' : 'Nonzero'; // SVG 默认 nonzero
    let xaml = `${indent}<Path`;
    if (fill) xaml += ` Fill="${fill}"`;
    xaml += '><Path.Data><PathGeometry FillRule="' + fr + '" Figures="' + esc(d) + '"/></Path.Data>';
    if (tf) {
      const [a, b, c, dd, e, f] = tf.split(/[\s,]+/).map(Number);
      xaml += `<Path.RenderTransform><MatrixTransform Matrix="${a},${b},${c},${dd},${e},${f}"/></Path.RenderTransform>`;
    }
    xaml += '</Path>';
    out.push(xaml);
  }
  return { ox, oy, w, h, out };
}

function renderIcon(cfg, indent) {
  const entry = findEntry(cfg.lastId);
  const { ox, oy, w, h, out } = parseSvg(entry.svg, indent + '        ');
  let xaml = `${indent}<!-- ${cfg.short} (${entry.id}) -->\n`;
  xaml += `${indent}<Viewbox x:Key="${cfg.key}" x:Shared="False" Stretch="Uniform">\n`;
  xaml += `${indent}    <Canvas Width="${w}" Height="${h}">\n`;
  if (ox !== 0 || oy !== 0) {
    xaml += `${indent}        <Canvas.RenderTransform><TranslateTransform X="${-ox}" Y="${-oy}"/></Canvas.RenderTransform>\n`;
  }
  for (const L of cfg.layers || []) {
    xaml += `${indent}        <Rectangle Width="${L.w}" Height="${L.h}" Fill="${L.fill}"`;
    if (L.radius) xaml += ` RadiusX="${L.radius}" RadiusY="${L.radius}"`;
    xaml += ` Canvas.Left="${L.x}" Canvas.Top="${L.y}"/>\n`;
  }
  xaml += out.join('\n') + '\n';
  xaml += `${indent}    </Canvas>\n${indent}</Viewbox>`;
  return xaml;
}

// 无 svgKey 的手建图标（纯 LAYER 矩形组成）在此扩展, 模板:
// function renderCustom(indent) {
//   let x = `${indent}<Viewbox x:Key="Icon_Xxx" x:Shared="False" Stretch="Uniform">\n`;
//   x += `${indent}    <Canvas Width="W" Height="H">\n`;
//   x += `${indent}        <Rectangle Width="..." Height="..." Fill="#..." Canvas.Left="..." Canvas.Top="..."/>\n`;
//   x += `${indent}    </Canvas>\n${indent}</Viewbox>`;
//   return x;
// }

const parts = [];
parts.push('<!-- 由 gen-icons-xaml.js 自动生成, 数据源: MasterGo extractSvg 导出 -->');
parts.push('<ResourceDictionary');
parts.push('    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"');
parts.push('    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"');
parts.push('    xmlns:o="http://schemas.microsoft.com/winfx/2006/xaml/presentation/options">');
parts.push('');
for (const cfg of ICON_MAP) {
  parts.push(renderIcon(cfg, '    '));
  parts.push('');
}
parts.push('</ResourceDictionary>');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, parts.join('\n'), 'utf8');
console.log('已生成 ' + outFile + ' (' + ICON_MAP.length + ' 个图标)');
