const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('load', () => console.log(`Page loaded! url: ${page.url()}`));

  await gotoIconfontHome(page);
  await loginOfGithub(page);
  await authOfGithub(page);
  await gotoIconfontMyProjects(page);
  await getMyProjectList(page);

  await page.close();
  await browser.close();
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
  console.log('ret:', ret);

  const links = await page.$$('.nav-container:nth-child(2) > .nav-lists >.nav-item');

  console.log(links);
}
