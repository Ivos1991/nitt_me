import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:3000/');
  await page.locator('canvas').waitFor();
  const text=id=>page.locator('#'+id).textContent();
  assert.match(await text('previewMeta'),/462 עיניים.*17 שורות/);
  await page.screenshot({path:'build/mobile.png'});
  await page.click('#assemblyMode');
  assert.match(await text('previewMeta'),/4 חלקים/);
  await page.locator('#child').selectOption({label:'יד ימין'});
  await page.fill('#anchorRow','10');
  await page.fill('#anchorStart','3');
  await page.fill('#anchorEnd','8');
  await page.click('#attach');
  assert.match(await text('assemblyStatus'),/חובר לשורה 10, עיניים 3–8/);
  await page.screenshot({path:'build/assembly.png'});
  await page.click('#newProject');
  await page.fill('#dialogName','בדיקת פרויקט');
  await page.click('#confirm');
  await page.selectOption('#mode','oval');
  await page.fill('#pattern','ch 8\nR1: 16 sc\nR2: (sc, inc) x 8');
  await page.waitForFunction(()=>document.getElementById('previewMeta').textContent.includes('40 עיניים'));
  await page.fill('#pattern','ch 8\nR1: 16 sc\nR2: 15 sc');
  await page.waitForFunction(()=>document.getElementById('status').classList.contains('error'));
  await page.reload();
  assert.equal(await text('projectName'),'בדיקת פרויקט');
  assert.match(await page.inputValue('#pattern'),/15 sc/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  assert.deepEqual(issues,[]);
  console.log('Mobile checks passed');
} finally { await browser.close(); }
