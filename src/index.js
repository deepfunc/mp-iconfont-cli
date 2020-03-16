const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('load', () => console.log(`Page loaded! url: ${page.url()}`));

  await gotoIconfontHome(page);
  await loginOfGithub(page);
  await authOfGithub(page);

  // await page.waitFor(5000);
  // console.log(page.url());
  // const btn = await page.$('a[href="/user/center"]');
  // console.log(btn);
  // console.log(await page.content());
  // const btn = await page.$('#js-oauth-authorize-btn');
  // console.log(btn);
  // const a = await page.waitFor(() => {
  //   console.log(document.body);
  //   return true;
  // });
  // console.log(a.jsonValue());
  // await page.waitFor(3000);
  // console.log('1:', page.url());
  // const body = await page.waitForSelector('#js-oauth-authorize-btn:enabled');
  // console.log(body);
  // const res = await body.$eval('body', node => {
  //   console.log(2);
  //   return node.innerText;
  // });
  // console.log(3);
  // console.log(res);
  // const result = await page.evaluate(x => {
  //   console.log(2);
  //   const body = document.body;
  //   console.log(body);
  //   return body;
  // });

  // console.log(page.url());
  // console.log(await page.content());
  // await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // console.log(page.url());
  // const authBtn = await page.waitForSelector('#js-oauth-authorize-btn:enabled');
  // await page.waitFor(2000);
  // await authBtn.click();

  // console.log('返回 iconfont...');
  // await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // console.log(await page.content());

  await page.close();
  await browser.close();
})();

async function gotoIconfontHome(page) {
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
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  const loginFieldOfGithub = await page.$('#login_field');
  await loginFieldOfGithub.type('6261625@qq.com');
  const passwordFieldOfGithub = await page.$('#password');
  await passwordFieldOfGithub.type('leo06010213');
  const submitOfGithub = await page.$('input[type="submit"]');
  await submitOfGithub.click();
}

async function authOfGithub(page) {
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitForNavigation({ timeout: 5000 });
  console.log(page.url());
}
