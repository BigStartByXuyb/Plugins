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

// ---- 按钮族（IconButton / Button / StatusButton）固定参数 ----
const buttonMapping = path.join(dir, 'button-mapping.json');
const buttonOutput = path.join(dir, 'button-page.xml');
fs.writeFileSync(buttonMapping, JSON.stringify({
  rootRef: 'root',
  sourceNodes: [
    { ref: 'root', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
    { ref: 'btn', parentRef: 'root', pageAbsX: 100, pageAbsY: 292, relativeX: 100, relativeY: 292, width: 60, height: 44 },
    { ref: 'btnIcon', parentRef: 'root', pageAbsX: 300, pageAbsY: 292, relativeX: 300, relativeY: 292, width: 170, height: 80 },
    { ref: 'btnIcon/icon', parentRef: 'btnIcon', pageAbsX: 312, pageAbsY: 306, relativeX: 12, relativeY: 14, width: 97.0352783203125, height: 65.99 },
    { ref: 'status', parentRef: 'root', pageAbsX: 500, pageAbsY: 292, relativeX: 500, relativeY: 292, width: 140, height: 75 },
    { ref: 'label', parentRef: 'root', pageAbsX: 200, pageAbsY: 292, relativeX: 200, relativeY: 292, width: 80, height: 22, type: 'TEXT', text: '速度' }
  ],
  textAudit: [{ sourceRef: 'label', sourceText: '速度', visibility: true, role: 'content', decision: 'emit', outputRefs: ['TXT_1'] }],
  nodes: [
    {
      ref: 'btn', sourceRef: 'btn', sourceParent: 'root', id: 'BTN_1', xmlId: 'BTN_1',
      controlType: 'IconButton', absX: 100, absY: 292, w: 60, h: 44,
      attrs: { Style: 'SmallButton', Value: '+5', IconWidth: '999', IconHeight: '999' }
    },
    {
      ref: 'btnIcon', sourceRef: 'btnIcon', sourceParent: 'root', id: 'BTN_2', xmlId: 'BTN_2',
      controlType: 'IconButton', absX: 300, absY: 292, w: 170, h: 80,
      attrs: { Style: 'RightButtonStyle', Icon: 'ExitGeometry', Value: '退出', PageName: 'Jump:Home' },
      iconSize: { width: 97.0352783203125, height: 65.99, sourceRef: 'btnIcon/icon' }
    },
    {
      ref: 'status', sourceRef: 'status', sourceParent: 'root', id: 'STA_1', xmlId: 'STA_1',
      controlType: 'StatusButton', absX: 500, absY: 292, w: 140, h: 75, attrs: {}
    },
    {
      ref: 'label', sourceRef: 'label', sourceParent: 'root', id: 'TXT_1', xmlId: 'TXT_1',
      controlType: 'TextBlock', absX: 200, absY: 292, w: 80, h: 22,
      sourceText: '速度', valueSource: 'dsl.text', attrs: { Value: '速度' }
    }
  ]
}, null, 2));
const fresh = spawnSync(process.execPath, [path.join(__dirname, 'gen-iocontrol-xml.js'), '--fresh', buttonMapping, '--out', buttonOutput], { encoding: 'utf8' });
assert.strictEqual(fresh.status, 0, '按钮族映射必须能正常渲染: ' + fresh.stderr);
const buttonXml = fs.readFileSync(buttonOutput, 'utf8');
const buttonTag = (buttonXml.match(/<IOContorl[^>]*ID="BTN_1"[\s\S]*?\/>/) || [''])[0];
assert.ok(buttonTag, 'fresh 输出必须包含无图标按钮节点');
assert.match(buttonTag, /PageName=""/, '无图标按钮缺少空 PageName 占位');
assert.match(buttonTag, /IOVisible=""/, '无图标按钮缺少空 IOVisible 占位');
assert.match(buttonTag, /IOCommand=""/, '无图标按钮缺少空 IOCommand 占位');
assert.ok(!/IconWidth=|IconHeight=/.test(buttonTag), '无图标按钮不得发射 IconWidth/IconHeight');
const iconButtonTag = (buttonXml.match(/<IOContorl[^>]*ID="BTN_2"[\s\S]*?\/>/) || [''])[0];
assert.ok(iconButtonTag, 'fresh 输出必须包含带图标按钮节点');
assert.match(iconButtonTag, /IconWidth="97"/, 'IconWidth 必须取图标图形节点 bbox 并取整');
assert.match(iconButtonTag, /IconHeight="66"/, 'IconHeight 必须取图标图形节点 bbox 并取整');
assert.match(iconButtonTag, /PageName="Jump:Home"/, '真实 PageName 必须按映射发射');
assert.match(iconButtonTag, /IOCommand=""/, '带图标按钮同样要补空 IOCommand 占位');
const statusTag = (buttonXml.match(/<IOContorl[^>]*ControlType="StatusButton"[\s\S]*?\/>/) || [''])[0];
assert.ok(statusTag, 'fresh 输出必须包含 StatusButton 节点');
assert.match(statusTag, /PageName=""/, 'StatusButton 必须同样发射空 PageName 占位');
assert.match(statusTag, /IOVisible=""/, 'StatusButton 必须同样发射空 IOVisible 占位');
assert.match(statusTag, /IOCommand=""/, 'StatusButton 必须同样发射空 IOCommand 占位');
assert.ok(!/IconWidth=|IconHeight=/.test(statusTag), '无图标的 StatusButton 不得发射 IconWidth/IconHeight');
const textTag = (buttonXml.match(/<IOContorl[^>]*ControlType="TextBlock"[\s\S]*?\/>/) || [''])[0];
assert.ok(textTag, 'fresh 输出必须包含 TextBlock 节点');
assert.ok(!/PageName=|IconWidth=|IconHeight=/.test(textTag), '非按钮族控件不得获得按钮族固定参数');
assert.match(textTag, /Width="NaN"/, 'TextBlock 的 Width 必须固定为 NaN');
assert.match(textTag, /Height="40"/, 'TextBlock 的 Height 必须固定为 40');

// 门禁：按钮带 Icon 却没有 iconSize 必须直接失败
const badMapping = path.join(dir, 'button-missing-iconsize.json');
const badOutput = path.join(dir, 'button-missing-iconsize.xml');
const bad = JSON.parse(fs.readFileSync(buttonMapping, 'utf8'));
delete bad.nodes.find(node => node.ref === 'btnIcon').iconSize;
fs.writeFileSync(badMapping, JSON.stringify(bad, null, 2));
const badResult = spawnSync(process.execPath, [path.join(__dirname, 'gen-iocontrol-xml.js'), '--fresh', badMapping, '--out', badOutput], { encoding: 'utf8' });
assert.notStrictEqual(badResult.status, 0, '带图标但没有 iconSize 的按钮必须被拒绝');
assert.match(badResult.stderr + badResult.stdout, /缺少 iconSize/);

// merge：缺失的占位参数新增；已有真实 PageName 保留；IconWidth/IconHeight 按图标 bbox 覆盖
const existingXml = path.join(dir, 'existing-button-page.xml');
const mergedXml = path.join(dir, 'merged-button-page.xml');
fs.writeFileSync(existingXml, [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<IOContorl',
  '    ID=""',
  '    Left="NaN"',
  '    Top="NaN"',
  '    Width="NaN"',
  '    Height="NaN">',
  '    <IOContorl',
  '        ID="BTN_1"',
  '        ControlType="IconButton"',
  '        Style="SmallButton"',
  '        PageName="Jump:Legacy"',
  '        Value="+5"',
  '        Left="100"',
  '        Top="100"',
  '        Width="60"',
  '        Height="44" />',
  '    <IOContorl',
  '        ID="BTN_2"',
  '        ControlType="IconButton"',
  '        Style="RightButtonStyle"',
  '        Icon="ExitGeometry"',
  '        PageName="Jump:Home"',
  '        IconWidth="24"',
  '        IconHeight="24"',
  '        Value="退出"',
  '        Left="300"',
  '        Top="100"',
  '        Width="170"',
  '        Height="80" />',
  '    <IOContorl',
  '        ID="TXT_1"',
  '        ControlType="TextBlock"',
  '        Value="旧标签"',
  '        Left="200"',
  '        Top="100"',
  '        Width="80"',
  '        Height="40" />',
  '</IOContorl>',
  ''
].join('\n'));
const merge = spawnSync(process.execPath, [path.join(__dirname, 'gen-iocontrol-xml.js'), '--merge', existingXml, buttonMapping, '--out', mergedXml], { encoding: 'utf8' });
assert.strictEqual(merge.status, 0, 'merge 必须成功: ' + merge.stderr);
const mergedXmlText = fs.readFileSync(mergedXml, 'utf8');
const mergedButtonTag = (mergedXmlText.match(/<IOContorl[^>]*ID="BTN_1"[\s\S]*?\/>/) || [''])[0];
assert.match(mergedButtonTag, /PageName="Jump:Legacy"/, 'merge 必须保留工程师已有的真实 PageName');
assert.match(mergedButtonTag, /IOVisible=""/, 'merge 必须补齐空 IOVisible 占位');
assert.match(mergedButtonTag, /IOCommand=""/, 'merge 必须补齐空 IOCommand 占位');
const mergedIconButtonTag = (mergedXmlText.match(/<IOContorl[^>]*ID="BTN_2"[\s\S]*?\/>/) || [''])[0];
assert.match(mergedIconButtonTag, /PageName="Jump:Home"/, 'merge 必须保留已有真实 PageName（带图标按钮）');
assert.match(mergedIconButtonTag, /IconWidth="97"/, 'merge 必须把 IconWidth 覆盖为图标 bbox 宽度');
assert.match(mergedIconButtonTag, /IconHeight="66"/, 'merge 必须把 IconHeight 覆盖为图标 bbox 高度');
const mergedTextTag = (mergedXmlText.match(/<IOContorl[^>]*ID="TXT_1"[\s\S]*?\/>/) || [''])[0];
assert.match(mergedTextTag, /Width="NaN"/, 'merge 必须把 TextBlock 的 Width 覆写为 NaN');
assert.match(mergedTextTag, /Height="40"/, 'merge 必须保持 TextBlock 的 Height=40');
assert.match(mergedTextTag, /Value="速度"/, 'merge 必须按 dsl.text 覆盖旧文本，保证 Value 与设计文本一致');

console.log('PASS IOContorl typed-node gate regression test');
console.log('PASS IconButton fixed-attribute regression test');
