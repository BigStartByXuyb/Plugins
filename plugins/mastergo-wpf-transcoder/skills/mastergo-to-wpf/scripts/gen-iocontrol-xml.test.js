'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iocontrol-xml-'));
const mapping = path.join(dir, 'mapping.json');
const output = path.join(dir, 'page.xml');
fs.writeFileSync(mapping, JSON.stringify({
  rootRef: 'root',
  sourceNodes: [
    { ref: 'root', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
    { ref: 'untyped', parentRef: 'root', pageAbsX: 10, pageAbsY: 202, relativeX: 10, relativeY: 202, width: 50, height: 40 }
  ],
  nodes: [{
    ref: 'untyped', sourceRef: 'untyped', sourceParent: 'root',
    absX: 10, absY: 202, w: 50, h: 40, attrs: {}
  }]
}, null, 2));

const result = spawnSync(process.execPath, [path.join(__dirname, 'gen-iocontrol-xml.js'), '--fresh', mapping, '--out', output], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0, '无 ControlType 的非根节点必须被拒绝');
assert.match(result.stderr + result.stdout, /缺少 ControlType/);

const duplicateMapping = path.join(dir, 'duplicate-id-mapping.json');
const duplicateOutput = path.join(dir, 'duplicate-id-page.xml');
fs.writeFileSync(duplicateMapping, JSON.stringify({
  rootRef: 'root',
  sourceNodes: [
    { ref: 'root', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
    { ref: 'a', parentRef: 'root', pageAbsX: 10, pageAbsY: 202, relativeX: 10, relativeY: 202, width: 20, height: 20 },
    { ref: 'b', parentRef: 'root', pageAbsX: 40, pageAbsY: 202, relativeX: 40, relativeY: 202, width: 20, height: 20 }
  ],
  nodes: [
    { ref: 'a', sourceRef: 'a', sourceParent: 'root', id: 'DUPLICATE', xmlId: 'DUPLICATE', controlType: 'IconButton', absX: 10, absY: 202, w: 20, h: 20 },
    { ref: 'b', sourceRef: 'b', sourceParent: 'root', id: 'DUPLICATE', xmlId: 'DUPLICATE', controlType: 'IconButton', absX: 40, absY: 202, w: 20, h: 20 }
  ]
}, null, 2));
const duplicateResult = spawnSync(process.execPath, [path.join(__dirname, 'gen-iocontrol-xml.js'), '--fresh', duplicateMapping, '--out', duplicateOutput], { encoding: 'utf8' });
assert.notStrictEqual(duplicateResult.status, 0, '重复 XML ID 必须被拒绝');
assert.match(duplicateResult.stderr + duplicateResult.stdout, /XML ID 必须唯一/);
console.log('PASS IOContorl typed-node gate regression test');
