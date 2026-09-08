#!/usr/bin/env node
"use strict";

/*
 * Extract visibility facts from MasterGo DSL.
 *
 * This script does not generate IOContorl mapping. It produces an evidence
 * file for the mapper/AI: every discovered node gets its explicit visibility
 * field, effective visibility after ancestor inheritance, and the source of
 * that decision. Text and PATH nodes are also indexed separately.
 */

const fs = require("fs");
const path = require("path");

function fail(message) { throw new Error("MasterGo visibility audit failed: " + message); }

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (error) { fail("cannot read JSON " + filePath + ": " + error.message); }
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && (value === 0 || value === 1)) return value === 1;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "visible", "shown", "show"].includes(normalized)) return true;
  if (["false", "0", "hidden", "hide", "collapsed"].includes(normalized)) return false;
  return null;
}

function getPath(object, parts) {
  let current = object;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

const VISIBILITY_PATHS = [
  ["visible"],
  ["visibility"],
  ["properties", "visible"],
  ["properties", "visibility"],
  ["variantProps", "visible"],
  ["variantProps", "visibility"],
  ["componentProperties", "visible"],
  ["componentProperties", "visibility"],
  ["overrides", "visible"],
  ["overrides", "visibility"]
];

function explicitVisibility(node) {
  for (const parts of VISIBILITY_PATHS) {
    const raw = getPath(node, parts);
    const parsed = parseBoolean(raw);
    if (parsed !== null) {
      return {
        value: parsed,
        property: parts.join("."),
        raw
      };
    }
  }
  return null;
}

function nodeRef(node, fallback) {
  for (const key of ["ref", "id", "layerId", "nodeId"]) {
    if (typeof node[key] === "string" && node[key]) return node[key];
  }
  return fallback;
}

function nodeType(node) {
  return node.type || node.nodeType || node.t || null;
}

function nodeName(node) {
  return node.name || node.nodeName || node.n || null;
}

function nodeText(node) {
  for (const key of ["text", "characters", "content"]) {
    if (typeof node[key] === "string") return node[key];
  }
  return null;
}

const CHILD_KEYS = ["children", "nodes", "c", "layers", "items"];

function childEntries(node) {
  const result = [];
  for (const key of CHILD_KEYS) {
    if (!Array.isArray(node[key])) continue;
    for (const child of node[key]) result.push({ key, child });
  }
  return result;
}

function looksLikeNode(value) {
  return value && typeof value === "object" && !Array.isArray(value) && (
    typeof value.type === "string" || typeof value.nodeType === "string" ||
    typeof value.t === "string" || typeof value.id === "string" ||
    typeof value.ref === "string" || typeof value.layerId === "string"
  );
}

function collectNodes(input) {
  const result = [];
  const visited = new Set();

  function visit(value, parent, containerPath) {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, parent, containerPath + "[" + index + "]"));
      return;
    }
    if (!looksLikeNode(value)) {
      Object.keys(value).forEach(key => visit(value[key], parent, containerPath + "." + key));
      return;
    }

    visited.add(value);
    const ref = nodeRef(value, containerPath);
    const explicit = explicitVisibility(value);
    const record = {
      ref,
      parentRef: parent ? parent.ref : null,
      type: nodeType(value),
      name: nodeName(value),
      text: nodeText(value),
      explicitVisible: explicit ? explicit.value : null,
      visibilityProperty: explicit ? explicit.property : null,
      visibilityRaw: explicit ? explicit.raw : null,
      defaultVisible: explicit === null,
      effectiveVisible: null,
      visibilitySourceRef: null,
      sourcePath: containerPath
    };
    record.effectiveVisible = explicit ? explicit.value : (parent ? parent.effectiveVisible : true);
    if (parent && parent.effectiveVisible === false) {
      record.effectiveVisible = false;
      record.visibilitySourceRef = parent.visibilitySourceRef || parent.ref;
    } else if (explicit) {
      record.visibilitySourceRef = record.ref;
    } else if (parent && parent.visibilitySourceRef) {
      record.visibilitySourceRef = parent.visibilitySourceRef;
    }
    result.push(record);
    for (const entry of childEntries(value)) visit(entry.child, record, containerPath + "." + entry.key);
  }

  visit(input, null, "$root");
  return result;
}

function main() {
  const argv = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--input") inputPath = argv[++index];
    else if (argv[index] === "--out") outputPath = argv[++index];
    else fail("usage: node resolve-mastergo-visibility.js --input <dsl.json> --out <visibility.json>");
  }
  if (!inputPath || !outputPath) fail("usage: node resolve-mastergo-visibility.js --input <dsl.json> --out <visibility.json>");

  const nodes = collectNodes(readJson(inputPath));
  const output = {
    schemaVersion: "mastergo-visibility-audit/1",
    input: path.resolve(inputPath),
    nodeCount: nodes.length,
    nodes,
    texts: nodes.filter(node => node.type === "TEXT" || node.type === "text"),
    paths: nodes.filter(node => node.type === "PATH" || node.type === "path")
  };
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ output: path.resolve(outputPath), nodeCount: output.nodeCount, textCount: output.texts.length, pathCount: output.paths.length }, null, 2));
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { collectNodes, explicitVisibility, parseBoolean };
