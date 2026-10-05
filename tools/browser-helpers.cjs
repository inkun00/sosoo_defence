const fs=require('node:fs');
const assert=require('node:assert/strict');
const executable='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
exports.launchOptions=()=>({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync(executable)?executable:undefined)});
exports.action=async(page,key,touch=false)=>{const c=await page.evaluate(key=>window.__gameTest.ui.getButtonBounds(key),key);assert.ok(c?.enabled,key);const b=await page.locator('canvas').boundingBox(),x=b.x+c.x/1280*b.width,y=b.y+c.y/800*b.height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(70);};
exports.cell=async(page,x,y,touch=false)=>{const b=await page.locator('canvas').boundingBox(),px=b.x+(40+(x+.5)*58)/1280*b.width,py=b.y+(118+(y+.5)*58)/800*b.height;if(touch)await page.touchscreen.tap(px,py);else await page.mouse.click(px,py);};
exports.answer=async(page,touch=false)=>{const q=await page.evaluate(()=>window.__gameTest.model.pendingPurchase),text=((q.before-q.cost)/1000).toFixed(q.digits);if(touch)for(const c of text)await exports.action(page,'purchase-key:'+(c==='.'?'dot':c),true);else await page.keyboard.type(text);await exports.action(page,'purchase-confirm',touch);};
exports.installFixture=async(page,id,c)=>page.evaluate(({id,c})=>{const m=window.__gameTest.model;if(!m.requestPurchase(c,id))throw Error('fixture purchase '+id);const q=m.pendingPurchase;if(!m.answerPurchase(((q.before-q.cost)/1000).toFixed(3)))throw Error('fixture answer');}, {id,c});
