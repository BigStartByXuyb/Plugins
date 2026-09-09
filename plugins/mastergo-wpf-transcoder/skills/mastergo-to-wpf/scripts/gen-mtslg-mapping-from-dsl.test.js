'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mastergo-mtslg-mapping-'));
const dslPath = path.join(dir, 'dsl.snapshot.json');
const visibilityPath = path.join(dir, 'visibility.json');
const iconMapPath = path.join(dir, 'icon-map.json');
const outputPath = path.join(dir, 'mapping.json');
const rootRef = 'test:root';

function textNode(id, parentRef, value, rx, ry) {
  return {
    type: 'TEXT',
    id,
    name: value,
    layoutStyle: { width: 40, height: 22, relativeX: rx, relativeY: ry },
    text: [{ text: value }],
    parentRef
  };
}

function buttonGroup(id, rx, value) {
  return {
    type: 'GROUP',
    id,
    name: '按钮',
    layoutStyle: { width: 60, height: 60, relativeX: rx, relativeY: 0 },
    children: [textNode(id + '/text', id, value, 10, 19)]
  };
}

const innerRef = rootRef + '/inner';
const dsl = {
  styles: {},
  nodes: [{
    type: 'INSTANCE',
    id: rootRef,
    name: '界面内操作组',
    layoutStyle: { width: 342, height: 60, relativeX: 0, relativeY: 0 },
    componentInfo: { properties: { '属性 1': '加减快捷键-无标题' } },
    children: [{
      type: 'INSTANCE',
      id: innerRef,
      name: '加减快捷键-无标题',
      layoutStyle: { width: 342, height: 60, relativeX: 0, relativeY: 0 },
      componentInfo: {},
      children: [
        buttonGroup(innerRef + '/plus5', 0, '+5'),
        buttonGroup(innerRef + '/minus5', 72, '-5'),
        buttonGroup(innerRef + '/plus1', 144, '+1'),
        buttonGroup(innerRef + '/minus1', 216, '-1'),
        {
          type: 'GROUP',
          id: innerRef + '/value-group',
          name: '组 2525',
          layoutStyle: { width: 50, height: 48, relativeX: 0, relativeY: 0 },
          children: [
            textNode(innerRef + '/value-group/value', innerRef + '/value-group', '9.0%', 0, 26),
            textNode(innerRef + '/value-group/direction', innerRef + '/value-group', 'Dir', 29, 0)
          ]
        }
      ]
    }]
  }],
  components: []
};

fs.writeFileSync(dslPath, JSON.stringify({
  schemaVersion: 'mastergo-dsl-capture/1',
  fileId: 'test-file',
  layerId: rootRef,
  pageName: 'mapping-test',
  ui: 'test',
  dsl,
  componentDocumentLinks: [],
  rules: []
}, null, 2));
fs.writeFileSync(visibilityPath, JSON.stringify({ nodes: [] }, null, 2));
fs.writeFileSync(iconMapPath, JSON.stringify({ icons: [] }, null, 2));

const script = path.join(__dirname, 'gen-mtslg-mapping-from-dsl.js');
const templateMap = path.join(__dirname, '..', 'references', 'adapters', 'mtslg-iocontrol', 'mtslg-iocontrol-map.json');
const result = spawnSync(process.execPath, [script,
  '--dsl', dslPath,
  '--visibility', visibilityPath,
  '--template-map', templateMap,
  '--icon-map', iconMapPath,
  '--out', outputPath
], { encoding: 'utf8' });

assert.strictEqual(result.status, 0, result.stderr || result.stdout);
const mapping = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.strictEqual(mapping.mappingTag, '新页面完整DSL映射');
assert.strictEqual(mapping.componentInstances.length, 1);
assert.strictEqual(mapping.nodes.filter(node => node.controlType === 'IconButton').length, 4);
assert.deepStrictEqual(
  mapping.nodes.filter(node => node.controlType === 'IconButton').map(node => node.attrs.Value),
  ['+5', '-5', '+1', '-1']
);
assert.deepStrictEqual(
  mapping.nodes.filter(node => node.controlType === 'TextBlock').map(node => node.attrs.Value),
  ['9.0%', 'Dir']
);
assert.deepStrictEqual(mapping.pending, []);
console.log('PASS MTSLG DSL-to-mapping text-slot regression test');
