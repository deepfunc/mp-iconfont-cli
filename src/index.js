const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const ora = require('ora');
const inquirer = require('inquirer');
const axios = require('axios');
const csstree = require('css-tree');
const mkdirp = require('mkdirp');

const spinner = ora();
const Configstore = require('configstore');
const packageJson = require('../package.json');
const config = new Configstore(packageJson.name);

const CWD = process.cwd();
const GITHUB_ACCOUNT = 'githubAccount';
const GITHUB_PASSWORD = 'githubPassword';
const ICON_PROJECT_IDX = 'iconProjectIdx';
const WXSS_SAVE_PATH = 'wxssSavePath';
const WXSS_DEFAULT_RELATIVE_PATH = 'src/styles/iconfont.wxss';

async function updateIconfontMain() {
  spinner.start('正在初始化');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  spinner.succeed('初始化完毕');
  try {
    await gotoIconfontHome(page);
    await loginOfGithub(page);
    await authOfGithub(page);
    await gotoIconfontMyProjects(page);
    await getMyProjectList(page);
    const url = await getProjectUrl(page);
    await saveWxssFile(url);
  } finally {
    await page.close();
    await browser.close();
  }
}

async function gotoIconfontHome(page) {
  spinner.start('访问 iconfont 主页');
  await page.goto('https://www.iconfont.cn/', { waitUntil: 'networkidle0' });
  const loginEle = await page.$('.signin');
  await loginEle.click();
  const loginGithubEle = await page.waitForSelector(
    'a[href="/api/login/github"]',
    { visible: true }
  );
  spinner.succeed('iconfont 主页加载完毕');
  await loginGithubEle.click();
}

async function loginOfGithub(page) {
  spinner.start('访问 GitHub 登录页面');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  const loginFieldOfGithub = await page.waitForSelector('#login_field');
  spinner.succeed('GitHub 登录页面加载完毕');
  let account = config.get(GITHUB_ACCOUNT);
  let password = config.get(GITHUB_PASSWORD);

  if (account == null) {
    const githubAccountInput = await inquirer.prompt({
      type: 'input',
      name: 'githubAccount',
      message: '请输入 Github 账号名称：'
    });
    const githubPasswordInput = await inquirer.prompt({
      type: 'password',
      name: 'githubPassword',
      message: `请输入 ${githubAccountInput.githubAccount} 的登录密码：`
    });
    account = githubAccountInput.githubAccount;
    password = githubPasswordInput.githubPassword;
    config.set(GITHUB_ACCOUNT, account);
    config.set(GITHUB_PASSWORD, password);
  }

  await loginFieldOfGithub.type(account);
  const passwordFieldOfGithub = await page.$('#password');
  await passwordFieldOfGithub.type(password);
  const submitOfGithub = await page.$('input[type="submit"]');
  await submitOfGithub.click();
}

async function authOfGithub(page) {
  spinner.start('GitHub 正在授权');
  const isNeedAuth = async page => {
    let ret = true;

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    try {
      await page.waitForSelector('#js-oauth-authorize-btn', { timeout: 3000 });
    } catch {
      ret = false;
    }

    return ret;
  };

  if (await isNeedAuth(page)) {
    const authBtn = await page.waitForSelector(
      '#js-oauth-authorize-btn:enabled'
    );
    await authBtn.click();
  }

  spinner.succeed('GitHub 授权完毕');
}

async function gotoIconfontMyProjects(page) {
  spinner.start('正在加载 iconfont 我的项目列表');
  await page.waitForSelector('a[href="/manage/index"]', { visible: true });
  await page.goto(
    'https://www.iconfont.cn/manage/index?manage_type=myprojects',
    { waitUntil: 'networkidle0' }
  );
}

async function getMyProjectList(page) {
  const list = await page.waitForSelector(
    '.nav-container:nth-child(2) > .nav-lists',
    { visible: true }
  );
  const projectList = await list.$$eval('.nav-item', nodes => {
    return nodes.map(n => {
      /changeProject\((\d+)\)/.test(n.getAttribute('mx-click'));
      return {
        id: RegExp.$1,
        name: n.children[0].innerHTML
      };
    });
  });
  spinner.succeed('我的项目列表加载完毕');

  let iconProjectIdx = config.get(ICON_PROJECT_IDX);
  if (iconProjectIdx == null || iconProjectIdx < 0) {
    const iconProjectInput = await inquirer.prompt({
      type: 'rawlist',
      name: 'iconProject',
      message: '请选择 iconfont 项目：',
      choices: projectList.map(p => p.name)
    });
    iconProjectIdx = projectList.findIndex(
      p => p.name === iconProjectInput.iconProject
    );
    config.set(ICON_PROJECT_IDX, iconProjectIdx);
  }
}

async function getProjectUrl(page) {
  const iconProjectIdx = config.get(ICON_PROJECT_IDX);
  const link = await page.waitForSelector(
    `.nav-container:nth-child(2) > .nav-lists >.nav-item:nth-child(` +
      `${iconProjectIdx + 1})`,
    { visible: true }
  );
  const projectName = await link.$eval('span', node => {
    return node.innerHTML;
  });
  spinner.info(`选择的项目是：${projectName}`);
  spinner.start('正在获取 CSS 地址');
  await link.click();

  // 这里有个难点，怎么等待 ajax 结束最简单？
  await page.waitFor(1000);

  await page.waitForSelector('.type-select.clearfix', { visible: true });
  const fontClassLink = await page.waitForSelector(
    '.type-select.clearfix > li:nth-child(2)'
  );
  await fontClassLink.click();
  const managerBar = await page.waitForSelector('.project-manage-bar');
  const needClickOnlineBtn = await managerBar.$eval('.bar-link', node => {
    return !node.classList.contains('show');
  });
  if (needClickOnlineBtn) {
    const onlineBtn = await page.$('.project-manage-bar > .bar-link');
    await onlineBtn.click();
  }

  await page.waitForSelector('.project-code-top', { visible: true });
  const needRefresh = await managerBar.$$eval('.cover-btn', nodes => {
    return nodes.length > 1;
  });
  if (needRefresh) {
    const refreshBtn = await page.waitForSelector(
      '.project-code-top > .cover-btn:nth-child(2)'
    );
    await refreshBtn.click();

    // 等待遮罩结束
    let mask = await page.waitForSelector('.mp-e2e-body');
    while (mask != null) {
      await page.waitFor(300);
      try {
        mask = await page.waitForSelector('.mp-e2e-body', 50);
      } catch {
        mask = null;
      }
    }
  }

  await page.waitForSelector('.project-code-top', { visible: true });
  const codeContainers = await page.$$(
    '.project-code-top ~ .project-code-container'
  );
  let code = await codeContainers[1].$eval('pre', node => {
    return node.innerHTML;
  });
  code = `https:${code}`;
  spinner.succeed('CSS 地址获取完毕');
  return code;
}

async function saveWxssFile(url) {
  spinner.start('正在下载 CSS 文件');
  const res = await axios.get(
    'https://at.alicdn.com/t/font_1543352_zgs8qbhk4x.css'
  );
  spinner.succeed('CSS 文件下载完毕');
  let savePath = config.get(WXSS_SAVE_PATH);
  if (savePath == null || savePath === '') {
    const savePathInput = await inquirer.prompt({
      type: 'input',
      name: 'savePath',
      message: '请输入 WXSS 文件保存路径：',
      default: WXSS_DEFAULT_RELATIVE_PATH
    });
    if (savePathInput.savePath === '') {
      savePathInput.savePath = WXSS_DEFAULT_RELATIVE_PATH;
    }
    savePath = path.resolve(CWD, savePathInput.savePath);
    console.log(savePath);
    config.set(WXSS_SAVE_PATH, savePath);
  }

  spinner.start('正在生成 WXSS 文件');
  let ast = csstree.parse(res.data);
  ast = csstree.toPlainObject(ast);
  const firstBlock = ast.children[0].block;
  firstBlock.children.splice(1, 1);
  const srcDeclarationContents = firstBlock.children[1].value.children;
  srcDeclarationContents.splice(0, 4);
  srcDeclarationContents.splice(3, srcDeclarationContents.length - 3);

  const content = csstree.generate(ast);
  await mkdirp(path.dirname(savePath));
  fs.writeFileSync(savePath, content);
  spinner.succeed('WXSS 文件保存完毕');
  spinner.info(`WXSS 文件路径是：${savePath}`);
}

function clearSettings() {
  config.clear();
}

module.exports = {
  updateIconfontMain,
  clearSettings
};
