'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('./validate-iocontrol-provenance');

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
console.log('PASS provenance regression test');
