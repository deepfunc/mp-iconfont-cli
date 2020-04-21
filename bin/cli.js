#!/usr/bin/env node

const program = require('commander');
const ora = require('ora');
const { updateIconfontMain, clearSettings } = require('../src');

const spinner = ora();

program.option('--clear', '清除所有设定');
program.option('--trace', '显示具体异常内容');

program.parse(process.argv);

if (program.clear) {
  clearSettings();
} else {
  updateIconfontMain().catch(err => {
    spinner.clear();
    spinner.fail('出错了，请重试下！');
    if (program.trace) {
      console.error(err);
    }
  });
}
