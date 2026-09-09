#!/usr/bin/env node
"use strict";

const fs = require("fs");

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const svgPath = arg("--svg");
const dslPath = arg("--dsl");
const outPath = arg("--out");
if (!svgPath || !dslPath || !outPath) throw new Error("usage: --svg <extractSvg.json> --dsl <dsl.snapshot.json> --out <icon-map.json>");
const svg = JSON.parse(fs.readFileSync(svgPath, "utf8"));
const snapshot = JSON.parse(fs.readFileSync(dslPath, "utf8"));
const paths = [];
function walk(node) {
  if (node.type === "PATH") paths.push(node.id);
  (node.children || []).forEach(walk);
}
walk(snapshot.dsl.nodes[0]);
const icons = [];
for (let i = 0; i < (svg.svgs || []).length; i++) {
  const item = svg.svgs[i];
  const sourceRef = paths.filter(ref => ref === item.id || ref.startsWith(item.id + "/"))[0];
  if (!sourceRef) continue;
  icons.push({
    sourceId: item.id,
    name: `PageGeometry${String(i + 1).padStart(3, "0")}`,
    comment: item.name || `页面图标${i + 1}`,
    sourceRef,
    status: "provisional"
  });
}
fs.writeFileSync(outPath, JSON.stringify({ icons }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outPath, icons: icons.length }, null, 2));
