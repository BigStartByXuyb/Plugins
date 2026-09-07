#!/usr/bin/env node
/*
 * MasterGo extractSvg JSON + page icon map -> one page Icon ResourceDictionary.
 *
 * Usage:
 *   node gen-mtslg-page-icons.js <extractSvg.json> <page-icon-map.json> <PageIcons.xaml>
 *
 * page-icon-map.json:
 * {
 *   "icons": [
 *     { "sourceId": "exact extractSvg entry id", "name": "ExitGeometry", "comment": "退出", "sourceRef": "MasterGo DSL ref" }
 *   ]
 * }
 *
 * sourceId, name, comment and sourceRef are all required. `name` is the approved
 * English resource name; `comment` is the Chinese display name written to XAML.
 * Duplicate names receive deterministic numeric suffixes (2, 3, ...). This tool
 * never derives a name from a layer ID, location, or geometry.
 */
const fs = require('fs');

const [, , svgFile, mapFile, outFile] = process.argv;
if (!svgFile || !mapFile || !outFile) {
  console.error('Usage: node gen-mtslg-page-icons.js <extractSvg.json> <page-icon-map.json> <PageIcons.xaml>');
  process.exit(1);
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error.message}`);
  }
}

function parsePaths(svg, sourceId) {
  const paths = [];
  const pathRe = /<path\s+d="([^"]*)"([^>]*?)\/?>/gi;
  let match;
  while ((match = pathRe.exec(svg))) {
    const d = match[1];
    if (!d.trim()) continue;
    const attrs = match[2];
    const fillRule = (attrs.match(/fill-rule="([^"]+)"/i) || [])[1];
    const matrix = (attrs.match(/transform="matrix\\(([^)]+)\\)"/i) || [])[1];
    paths.push({ d, fillRule: fillRule === 'evenodd' ? 'EvenOdd' : 'Nonzero', matrix });
  }
  if (paths.length === 0) throw new Error(`Source ${sourceId} has no supported SVG path`);
  return paths;
}

const svgData = readJson(svgFile, 'extractSvg JSON');
const iconMap = readJson(mapFile, 'page icon map');
if (!Array.isArray(svgData.svgs)) throw new Error('extractSvg JSON must contain svgs[]');
if (!Array.isArray(iconMap.icons) || iconMap.icons.length === 0) throw new Error('page icon map must contain a non-empty icons[]');

const svgById = new Map();
for (const item of svgData.svgs) {
  if (!item || typeof item.id !== 'string' || typeof item.svg !== 'string') continue;
  if (svgById.has(item.id)) throw new Error(`Duplicate extractSvg entry id: ${item.id}`);
  svgById.set(item.id, item.svg);
}

const keys = new Set();
function resolveKey(name) {
  if (/^MGIcon_/i.test(name)) {
    throw new Error(`Icon name must not use the layer-id prefix MGIcon_: ${name}`);
  }
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error(`Icon name must be an English identifier: ${name}`);
  }
  let key = name;
  let suffix = 2;
  while (keys.has(key)) key = `${name}${suffix++}`;
  keys.add(key);
  return key;
}
const output = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"',
  '                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"',
  '                    xmlns:o="http://schemas.microsoft.com/winfx/2006/xaml/presentation/options">'
];

for (const icon of iconMap.icons) {
  if (!icon || typeof icon.sourceId !== 'string' || typeof icon.name !== 'string' || typeof icon.comment !== 'string' || typeof icon.sourceRef !== 'string' || !icon.sourceId || !icon.name || !icon.comment || !icon.sourceRef) {
    throw new Error('Every icon requires non-empty sourceId, name, comment, and sourceRef');
  }
  const key = resolveKey(icon.name);
  const svg = svgById.get(icon.sourceId);
  if (!svg) throw new Error(`Icon sourceId is not an exact extractSvg entry id: ${icon.sourceId}`);
  const paths = parsePaths(svg, icon.sourceId);
  const fillRule = paths.some(path => path.fillRule === 'EvenOdd') ? 'EvenOdd' : 'Nonzero';
  if (paths.some(path => path.matrix)) {
    throw new Error(`Standard Geometry output cannot preserve SVG matrix transforms: ${icon.sourceId}`);
  }
  output.push(`  <!-- ${escapeXml(icon.comment)} -->`);
  const fillAttribute = fillRule === 'EvenOdd' ? ' FillRule="EvenOdd"' : '';
  output.push(`  <Geometry o:Freeze="True"${fillAttribute} x:Key="${escapeXml(key)}">`);
  for (const path of paths) output.push(`    ${path.d}`);
  output.push('  </Geometry>', '');
}

output.push('</ResourceDictionary>', '');
fs.writeFileSync(outFile, output.join('\n'), 'utf8');
console.log(`Generated ${keys.size} icon(s): ${outFile}`);
