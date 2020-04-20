const puppeteer = require('puppeteer');
const ora = require('ora');
const inquirer = require('inquirer');
const axios = require('axios');
const csstree = require('css-tree');

const spinner = ora();
const Configstore = require('configstore');
const packageJson = require('../package.json');
const config = new Configstore(packageJson.name);

const GITHUB_ACCOUNT = 'githubAccount';
const GITHUB_PASSWORD = 'githubPassword';

async function updateIconfontMain() {
  const spinner = ora();
  spinner.start('正在初始化');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  spinner.succeed('初始化完毕');
  await gotoIconfontHome(page);
  await loginOfGithub(page);
  await authOfGithub(page);
  await gotoIconfontMyProjects(page);
  await getMyProjectList(page);

  await page.close();
  await browser.close();
}

(async () => {
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // page.on('load', () => console.log(`Page loaded! url: ${page.url()}`));
  //
  // await gotoIconfontMyProjects(page);
  // await getMyProjectList(page);
  // await getProjectUrl(page);
  //
  // await page.close();
  // await browser.close();
  // const res = await axios.get('https://at.alicdn.com/t/font_1543352_zgs8qbhk4x.css');
  // let ast = csstree.parse(res.data);
  // ast = csstree.toPlainObject(ast);
  // const firstBlock = ast.children[0].block;
  // firstBlock.children.splice(1, 1);
  // const srcDeclarationContents = firstBlock.children[1].value.children;
  // srcDeclarationContents.splice(0, 4);
  // srcDeclarationContents.splice(3, srcDeclarationContents.length - 3);
  //
  // const content = csstree.generate(ast);
  // console.log(content);
})();

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
  // console.log(account);
  // console.log(password);

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
  const iconProject = await inquirer.prompt({
    type: 'rawlist',
    name: 'iconProject',
    message: '请选择 iconfont 项目：',
    choices: projectList.map(p => p.name)
  });
}

async function getProjectUrl(page) {
  const link = await page.waitForSelector(
    '.nav-container:nth-child(2) > .nav-lists >.nav-item:nth-child(3)',
    { visible: true }
  );
  const projectName = await link.$eval('span', node => {
    return node.innerHTML;
  });
  console.log(`project name: ${projectName}`);
  await link.click();

  // 这里有个难点，怎么等待 ajax 结束最简单？
  await page.waitFor(1000);
  console.log(page.url());

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
    console.log('css file need refresh!');
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
  const code = await codeContainers[1].$eval('pre', node => {
    return node.innerHTML;
  });
  console.log(`css url: https:${code}`);
}

module.exports = {
  updateIconfontMain
};
