import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const initial='R1: 8 sc, 3 sc in next stitch, 8sc, 2 sc in last stitch';
const second='R2: 8 sc, 3 inc, 8 sc, 2 inc';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox','--disable-3d-apis']});
try {
  const page=await browser.newPage({viewport:{width:390,height:780}});
  await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:3000/');
  await page.selectOption('#mode','oval');
  const area=page.locator('#pattern');
  await area.fill(initial+'\n'+second);
  assert.match(await area.inputValue(),/last stitch \(21\)\nR2:/);
  await area.press('Enter');
  await page.keyboard.insertText('r3: flo 22 sc, 2 dec');
  await area.blur();
  assert.equal(await area.inputValue(),initial+' (21)\n'+second+' (26)\nR3: flo 22 sc, 2 dec (24)');
  await area.focus();
  await area.press('End');
  await area.press('Enter');
  await page.keyboard.insertText('r4: 24 sc');
  await area.blur();
  assert.match(await area.inputValue(),/\(24\)\nR4: 24 sc \(24\)$/);
} finally { await browser.close(); }
console.log('Oval geometry, loop semantics, and live line counts passed');
