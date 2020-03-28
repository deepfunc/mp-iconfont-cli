const puppeteer = require('puppeteer');
const axios = require('axios');
const csstree = require('css-tree');

(async () => {
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // page.on('load', () => console.log(`Page loaded! url: ${page.url()}`));
  //
  // await gotoIconfontHome(page);
  // await loginOfGithub(page);
  // await authOfGithub(page);
  // await gotoIconfontMyProjects(page);
  // await getMyProjectList(page);
  // await getProjectUrl(page);
  //
  // await page.close();
  // await browser.close();

  const res = await axios.get('https://at.alicdn.com/t/font_1543352_zgs8qbhk4x.css');
  let ast = csstree.parse(res.data);
  ast = csstree.toPlainObject(ast);
  const firstBlock = ast.children[0].block;
  firstBlock.children.splice(1, 1);
  const srcDeclarationContents = firstBlock.children[1].value.children;
  srcDeclarationContents.splice(0, 4);
  srcDeclarationContents.splice(3, srcDeclarationContents.length - 3);

  const content = csstree.generate(ast);
  console.log(content);
})();

async function gotoIconfontHome(page) {
  console.log('gotoIconfontHome');
  await page.goto('https://www.iconfont.cn/', { waitUntil: 'networkidle0' });
  const loginEle = await page.$('.signin');
  await loginEle.click();
  const loginGithubEle = await page.waitForSelector(
    'a[href="/api/login/github"]',
    { visible: true }
  );
  await loginGithubEle.click();
}

async function loginOfGithub(page) {
  console.log('loginOfGithub');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  const loginFieldOfGithub = await page.$('#login_field');
  await loginFieldOfGithub.type('6261625@qq.com');
  const passwordFieldOfGithub = await page.$('#password');
  await passwordFieldOfGithub.type('leo06010213');
  const submitOfGithub = await page.$('input[type="submit"]');
  await submitOfGithub.click();
}

async function authOfGithub(page) {
  const isNeedAuth = async (page) => {
    let ret = true;

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    try {
      await page.waitForSelector('#js-oauth-authorize-btn', { timeout: 3000 });
    } catch {
      ret = false;
    }

    return ret;
  };

  console.log('gotoIconfontHome');
  if (await isNeedAuth(page)) {
    console.log('need auth');
    const authBtn = await page.waitForSelector('#js-oauth-authorize-btn:enabled');
    await authBtn.click();
  } else {
    console.log('don\'t need auth');
  }
}

async function gotoIconfontMyProjects(page) {
  console.log('gotoIconfontMyProjects');
  await page.waitForSelector('a[href="/manage/index"]', { visible: true });
  await page.goto(
    'https://www.iconfont.cn/manage/index?manage_type=myprojects',
    { waitUntil: 'networkidle0' }
  );
}

async function getMyProjectList(page) {
  console.log('getMyProjectList');
  const list = await page.waitForSelector(
    '.nav-container:nth-child(2) > .nav-lists',
    { visible: true }
  );
  const ret = await list.$$eval(
    '.nav-item',
    (nodes) => {
      return nodes.map(n => {
        /changeProject\((\d+)\)/.test(n.getAttribute('mx-click'));
        return {
          pId: RegExp.$1,
          pName: n.children[0].innerHTML
        };
      });
    });
  console.log('My project list:', ret);
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
  const fontClassLink = await page.waitForSelector('.type-select.clearfix > li:nth-child(2)');
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
    const refreshBtn = await page.waitForSelector('.project-code-top > .cover-btn:nth-child(2)');
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
  const codeContainers = await page.$$('.project-code-top ~ .project-code-container');
  const code = await codeContainers[1].$eval('pre', node => {
    return node.innerHTML;
  });
  console.log(`css url: https:${code}`);
}
