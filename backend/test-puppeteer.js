const puppeteer = require("puppeteer");

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: false });
  console.log("Browser launched!");
  const page = await browser.newPage();
  console.log("Page created!");
  await page.goto("https://example.com");
  console.log("Title:", await page.title());
  await browser.close();
  console.log("Done!");
})();
