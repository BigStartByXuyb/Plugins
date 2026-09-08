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
  const pathRe = /<path\b([^>]*?)\/?>/gi;
  let match;
  while ((match = pathRe.exec(svg))) {
    const attrs = match[1];
    const attrValue = name => {
      const found = attrs.match(new RegExp(name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", 'i'));
      return found ? (found[1] ?? found[2]) : undefined;
    };
    const d = attrValue('d');
    if (d === undefined) continue;
    if (!d.trim()) continue;
    const fillRule = attrValue('fill-rule');
    const transform = attrValue('transform');
    const matrix = (transform && transform.match(/^matrix\(([^)]+)\)$/i) || [])[1];
    paths.push({ d, fillRule: fillRule === 'evenodd' ? 'EvenOdd' : 'Nonzero', transform, matrix });
  }
  if (paths.length === 0) throw new Error(`Source ${sourceId} has no supported SVG path`);
  return paths;
}

function parseMatrix(matrix, sourceId) {
  const values = String(matrix).split(/[\s,]+/).filter(Boolean).map(Number);
  if (values.length !== 6 || values.some(value => !Number.isFinite(value))) {
    throw new Error(`Source ${sourceId} has an invalid SVG matrix transform: ${matrix}`);
  }
  return values;
}

function formatNumber(value) {
  const rounded = Number(Number(value).toFixed(12));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function transformPathData(data, matrixText, sourceId) {
  const matrix = parseMatrix(matrixText, sourceId);
  const [a, b, c, d, e, f] = matrix;
  const tokens = String(data).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  const parameterCount = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
  let index = 0;
  let command = null;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  const output = [];
  const isCommand = token => /^[A-Za-z]$/.test(token);
  const readNumber = () => {
    if (index >= tokens.length || isCommand(tokens[index])) {
      throw new Error(`Source ${sourceId} has incomplete SVG path data near token ${index}`);
    }
    const value = Number(tokens[index++]);
    if (!Number.isFinite(value)) throw new Error(`Source ${sourceId} has invalid SVG path number`);
    return value;
  };
  const transformPoint = ([x, y]) => [a * x + c * y + e, b * x + d * y + f];
  const pointText = ([x, y]) => `${formatNumber(x)},${formatNumber(y)}`;
  const relativePoint = (x, y, relative) => relative ? [currentX + x, currentY + y] : [x, y];

  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    if (!command) throw new Error(`Source ${sourceId} has SVG coordinates without a command`);
    const upper = command.toUpperCase();
    const relative = command === command.toLowerCase();
    if (upper === 'Z') {
      output.push('Z');
      currentX = startX;
      currentY = startY;
      command = null;
      continue;
    }
    const count = parameterCount[upper];
    if (!count) throw new Error(`Source ${sourceId} uses unsupported SVG command ${command}`);
    if (upper === 'A') {
      throw new Error(`Source ${sourceId} uses an arc command with a matrix transform; refusing lossy conversion`);
    }
    let firstMove = upper === 'M';
    while (index < tokens.length && !isCommand(tokens[index])) {
      const values = Array.from({ length: count }, readNumber);
      let points;
      let end;
      if (upper === 'H') {
        end = relativePoint(values[0], 0, relative);
        points = [end];
      } else if (upper === 'V') {
        end = relativePoint(0, values[0], relative);
        points = [end];
      } else if (upper === 'M' || upper === 'L' || upper === 'T') {
        end = relativePoint(values[0], values[1], relative);
        points = [end];
      } else if (upper === 'C') {
        points = [
          relativePoint(values[0], values[1], relative),
          relativePoint(values[2], values[3], relative),
          relativePoint(values[4], values[5], relative)
        ];
        end = points[2];
      } else if (upper === 'S' || upper === 'Q') {
        points = [
          relativePoint(values[0], values[1], relative),
          relativePoint(values[2], values[3], relative)
        ];
        end = points[1];
      }
      const transformed = points.map(transformPoint);
      if (upper === 'H' || upper === 'V') {
        output.push(`L${pointText(transformed[0])}`);
      } else if (upper === 'M' || upper === 'L' || upper === 'T') {
        output.push(`${firstMove ? 'M' : upper}${pointText(transformed[0])}`);
      } else if (upper === 'C') {
        output.push(`C ${transformed.map(pointText).join(' ')}`);
      } else {
        output.push(`${upper} ${transformed.map(pointText).join(' ')}`);
      }
      currentX = end[0];
      currentY = end[1];
      if (upper === 'M') {
        if (firstMove) {
          startX = currentX;
          startY = currentY;
          firstMove = false;
        }
        command = relative ? 'l' : 'L';
      }
    }
  }
  return output.join(' ');
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
  const fillRules = new Set(paths.map(path => path.fillRule));
  if (fillRules.size > 1) {
    throw new Error(`Mixed SVG fill rules are not supported in one Geometry resource: ${icon.sourceId}`);
  }
  const fillRule = paths[0].fillRule;
  if (paths.some(path => path.transform && !path.matrix)) {
    throw new Error(`Unsupported SVG transform (only matrix is supported): ${icon.sourceId}`);
  }
  const pathData = paths.map(path => path.matrix
    ? transformPathData(path.d, path.matrix, icon.sourceId)
    : path.d.trim());
  output.push(`  <!-- ${escapeXml(icon.comment)} -->`);
  output.push(`  <Geometry o:Freeze="True" x:Key="${escapeXml(key)}">`);
  output.push(`    ${fillRule === 'EvenOdd' ? 'F0' : 'F1'}`);
  for (const data of pathData) {
    for (const line of data.split(/\r?\n/)) output.push(`    ${line.trim()}`);
  }
  output.push('  </Geometry>', '');
}

output.push('</ResourceDictionary>', '');
fs.mkdirSync(require('path').dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, output.join('\n'), 'utf8');
console.log(`Generated ${keys.size} icon(s): ${outFile}`);
