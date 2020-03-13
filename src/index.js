const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.iconfont.cn/', { waitUntil: 'networkidle0' });
  const content = await page.content();

  const loginEle = await page.$('.signin');
  console.log('loginEle:', loginEle);
  await loginEle.click();
  console.log('loginGithubEle:', await page.$('a[href="/api/login/github"]'));

  await page.close();
  await browser.close();
})();
