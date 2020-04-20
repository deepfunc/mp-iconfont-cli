#!/usr/bin/env node

const program = require('commander');
const ora = require('ora');
const inquirer = require('inquirer');
const { updateIconfontMain } = require('../src');

program.option('--test <test>', 'test');

program.parse(process.argv);
// console.log(`test: ${program.test}`);

updateIconfontMain();
//
// const spinner = ora('Loading...').start();
//
// setTimeout(() => {
//   spinner.succeed('Succeed.');
// }, 2000);

// inquirer
//   .prompt([
//     {
//       type: 'list',
//       name: 'theme',
//       message: 'What do you want to do?',
//       choices: [
//         'Order a pizza',
//         'Make a reservation'
//       ]
//     },
//     {
//       type: 'rawlist',
//       name: 'size',
//       message: 'What size do you need',
//       choices: ['Jumbo', 'Large', 'Standard', 'Medium', 'Small', 'Micro'],
//       // filter: function (val) {
//       //   return val.toLowerCase();
//       // }
//     }
//   ])
//   .then(answers => {
//     console.log(JSON.stringify(answers, null, '  '));
//   });
