#!/usr/bin/env node
// 扫描 WPF 图标资源字典（Icons.xaml），找出 Path Data 坐标超出画布范围的图标。
// 这类图标在 Viewbox 缩放时会渲染到画布外（冲出卡片或不可见）。
// 用法: node scan-icon-coords.js <Icons.xaml路径>
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('用法: node scan-icon-coords.js <Icons.xaml>'); process.exit(1); }

const xml = fs.readFileSync(file, 'utf8');
const re = /<Viewbox x:Key="(\w+)"[^>]*>\s*<Canvas Width="([\d.]+)" Height="([\d.]+)">([\s\S]*?)<\/Canvas>/g;
let m, bad = 0;
while ((m = re.exec(xml))) {
  const [, key, w, h, body0] = m;
  // 先剔除 # 颜色值，否则 #003261 里的 3261 会误报
  const body = body0.replace(/#[0-9A-Fa-f]{3,8}/g, '');
  const nums = (body.match(/-?\d+\.?\d*/g) || []).map(Number);
  if (!nums.length) { console.log(`${key.padEnd(16)} 无数值（仅矩形等？）`); continue; }
  const mx = Math.max(...nums), mn = Math.min(...nums);
  // MatrixTransform 的平移分量可能很大但合法——简单启发：若存在 RenderTransform 则仅提示人工确认
  const hasTransform = /RenderTransform|MatrixTransform/.test(body);
  const overflow = mx > Math.max(+w, +h) * 1.15 || mn < -5;
  const tag = overflow ? (hasTransform ? '  <<< 越界?(含变换矩阵,人工确认)' : '  <<< 越界!需 TranslateTransform 归一化') : '';
  if (overflow && !hasTransform) bad++;
  console.log(`${key.padEnd(16)} canvas ${w}x${h}  范围 ${mn.toFixed(1)} ~ ${mx.toFixed(1)}${tag}`);
}
console.log(bad ? `\n${bad} 个图标需要修复（加 TranslateTransform 把最小坐标平移到 0）` : '\n全部正常');
