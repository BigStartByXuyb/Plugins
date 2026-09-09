'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate, validateTextAudit } = require('./validate-iocontrol-provenance');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iocontrol-provenance-'));
const xmlPath = path.join(dir, 'bad.xml');
const manifestPath = path.join(dir, 'mapping.json');

fs.writeFileSync(xmlPath, '<IOContorl ID="" Left="NaN" Top="NaN" Width="NaN" Height="NaN"><IOContorl ID="RelativePositionXLabel" ControlType="TextBlock" Value="X" Left="658" Top="476" Width="10" Height="16" /></IOContorl>');
fs.writeFileSync(manifestPath, JSON.stringify({ contentOriginY: 192, sourceNodes: [
  { ref: '3:44417', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
  { ref: '3:56338/3:53325/3:53243', parentRef: '3:44417', pageAbsX: 658, pageAbsY: 668, relativeX: 658, relativeY: 668, width: 63, height: 16, text: '镜头倍率' }
], nodes: [{
  xmlId: 'RelativePositionXLabel',
  sourceRef: '3:56338/3:53325/3:53243',
  sourceParent: '3:44417',
  sourceText: '镜头倍率',
  valueSource: 'dsl.text',
  expectedLeft: 0,
  expectedTop: 476,
  expectedWidth: 63,
  expectedHeight: 16
}] }));

const result = validate(xmlPath, manifestPath);
if (result.ok) throw new Error('校验器必须拒绝错误 Value 和错误 Width');
if (!result.errors.some(x => /Value/.test(x))) throw new Error('缺少 Value 错误');
if (!result.errors.some(x => /Width/.test(x))) throw new Error('缺少 Width 错误');
if (!result.errors.some(x => /expectedLeft/.test(x))) throw new Error('缺少 sourceNodes 坐标重算错误');
const flatXmlPath = path.join(dir, 'flat.xml');
const flatManifestPath = path.join(dir, 'flat.json');
fs.writeFileSync(flatXmlPath, '<IOContorl ID="" Left="NaN" Top="NaN" Width="NaN" Height="NaN"><IOContorl ID="FlatChild" ControlType="TextBlock" Value="SCAN" Left="150" Top="158" Width="45" Height="18" /></IOContorl>');
fs.writeFileSync(flatManifestPath, JSON.stringify({ contentOriginY: 192, rootRef: 'root', sourceNodes: [
  { ref: 'root', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
  { ref: 'component', parentRef: 'root', pageAbsX: 100, pageAbsY: 300, relativeX: 100, relativeY: 300, width: 384, height: 132 },
  { ref: 'component/scan', parentRef: 'component', pageAbsX: 150, pageAbsY: 350, relativeX: 50, relativeY: 50, width: 45, height: 18, text: 'SCAN' }
], nodes: [{
  xmlId: 'FlatChild', sourceRef: 'component/scan', sourceParent: 'component', layoutParent: null,
  sourceText: 'SCAN', valueSource: 'dsl.text', expectedLeft: 150, expectedTop: 158,
  expectedWidth: 45, expectedHeight: 18
}] }));
const flatResult = validate(flatXmlPath, flatManifestPath);
if (!flatResult.ok) throw new Error('展平模板节点应按 layoutParent=null 使用页面绝对坐标: ' + flatResult.errors.join('; '));
const fixed40XmlPath = path.join(dir, 'fixed40.xml');
const fixed40ManifestPath = path.join(dir, 'fixed40.json');
fs.writeFileSync(fixed40XmlPath, '<IOContorl ID="" Left="NaN" Top="NaN" Width="NaN" Height="NaN"><IOContorl ID="FixedText" ControlType="TextBlock" Value="标题" FontSize="16" Left="10" Top="20" Width="50" Height="40" /></IOContorl>');
fs.writeFileSync(fixed40ManifestPath, JSON.stringify({ contentOriginY: 192, sourceNodes: [
  { ref: 'root', parentRef: null, pageAbsX: 0, pageAbsY: 0, relativeX: 0, relativeY: 0, width: 1280, height: 1024 },
  { ref: 'text', parentRef: 'root', pageAbsX: 10, pageAbsY: 212, relativeX: 10, relativeY: 212, width: 50, height: 16, text: '标题' }
], nodes: [{
  xmlId: 'FixedText', sourceRef: 'text', sourceParent: 'root', sourceText: '标题', valueSource: 'dsl.text',
  expectedLeft: 10, expectedTop: 20, expectedWidth: 50, expectedHeight: 40,
  heightSource: 'mtslg.textblock.fixed-40'
}] }));
const fixed40Result = validate(fixed40XmlPath, fixed40ManifestPath);
if (!fixed40Result.ok) throw new Error('TextBlock 固定 40 高度应通过 provenance 校验: ' + fixed40Result.errors.join('; '));
const fixedManifestPath = path.join(dir, 'wrong-origin.json');
const fixedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
fixedManifest.contentOriginY = 191;
fs.writeFileSync(fixedManifestPath, JSON.stringify(fixedManifest));
const fixedResult = validate(xmlPath, fixedManifestPath);
if (fixedResult.ok || !fixedResult.errors.some(x => /固定为 192/.test(x))) {
  throw new Error('校验器必须拒绝非 192 的 contentOriginY');
}

const textAuditMapping = {
  sourceNodes: [
    { ref: 'visible-text', type: 'TEXT', text: '显示文本' },
    { ref: 'placeholder-text', type: 'TEXT', text: '组件占位文案' },
    { ref: 'hidden-text', type: 'TEXT', text: '隐藏文本' },
    { ref: 'title-text', type: 'TEXT', text: '标题' }
  ],
  nodes: [
    { xmlId: 'visible-text', sourceRef: 'visible-text', sourceText: '显示文本', valueSource: 'dsl.text' },
    { xmlId: 'placeholder-text', sourceRef: 'placeholder-text', sourceText: '组件占位文案', valueSource: 'dsl.text' }
  ],
  textAudit: [
    { sourceRef: 'visible-text', sourceText: '显示文本', visibility: true, role: 'content', decision: 'emit', outputRefs: ['visible-text'] },
    { sourceRef: 'placeholder-text', sourceText: '组件占位文案', visibility: true, role: 'mapped-placeholder', decision: 'emit', outputRefs: ['placeholder-text'] },
    { sourceRef: 'hidden-text', sourceText: '隐藏文本', visibility: false, role: 'content', decision: 'omit', omitReason: 'hidden', outputRefs: [] },
    { sourceRef: 'title-text', sourceText: '标题', visibility: true, role: 'page-title', decision: 'omit', omitReason: 'page-title', outputRefs: [] }
  ]
};
if (validateTextAudit(textAuditMapping, textAuditMapping.nodes).length !== 0) {
  throw new Error('正确的 textAudit 不应失败');
}
const missingVisibleOutput = JSON.parse(JSON.stringify(textAuditMapping));
missingVisibleOutput.nodes = [];
if (!validateTextAudit(missingVisibleOutput, missingVisibleOutput.nodes).some(x => /可见普通 TEXT/.test(x))) {
  throw new Error('可见普通 TEXT 缺少输出时必须失败');
}
console.log('PASS provenance regression test');
