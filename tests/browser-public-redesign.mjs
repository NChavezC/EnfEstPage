import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5173";
const engine = process.env.TEST_WEBKIT ? webkit : chromium;
const browser = await engine.launch(engine === chromium ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true } : { headless: true });
try {
 for (const mobile of [false, true]) {
  const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  await context.route("**/*",r=>["127.0.0.1","localhost"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/home");
  await page.getByRole("heading",{name:/Tu piel/}).waitFor();
  assert.equal(await page.locator("iframe").count(),0);
  assert.equal(await page.getByText("Antes y Después",{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:".agenda-local/redesign-"+engine.name()+"-"+(mobile?"mobile":"desktop")+".png",fullPage:true});
  await page.getByRole("link",{name:"Explora los tratamientos",exact:true}).first().click();
  await page.locator(".treatment-row").first().waitFor();
  const catalog=await (await context.request.get(base+"/api/agenda/catalog")).json();
  assert.ok(catalog.services.length>0);
  assert.equal(await page.locator(".treatment-row").count(),catalog.services.length);
  for(const service of catalog.services){
   await page.goto(base+"/tratamientos/"+service.id);
   await page.getByRole("heading",{name:service.name,exact:true}).waitFor();
   assert.equal(await page.locator(".care-text").innerText(),service.care || "Consulta con nosotros las indicaciones antes de tu visita.");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  const service=catalog.services[0];
  await page.goto(base+"/tratamientos/"+service.id);
  await page.getByRole("link",{name:"Reservar este tratamiento"}).click();
  await page.waitForFunction(()=>document.querySelector('button[aria-pressed="true"]'));
  assert.equal(await page.getByLabel("Categoría",{exact:true}).inputValue(),String(service.category_id));
  assert.equal(await page.getByRole("button",{name:new RegExp(service.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))}).getAttribute("aria-pressed"),"true");
  await page.goto(base+"/catalogo");await page.waitForURL("**/tratamientos");
  await page.goto(base+"/tratamientos/999999999");
  await page.getByRole("heading",{name:"Tratamiento no disponible"}).waitFor();
  await page.goto(base+"/contact");await page.getByText("O’Higgins 280",{exact:true}).waitFor();
  await page.screenshot({path:".agenda-local/contact-"+engine.name()+"-"+(mobile?"mobile":"desktop")+".png",fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(mobile){
   await page.setViewportSize({width:320,height:740});
   await page.goto(base+"/home");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.route("**/api/agenda/catalog",r=>r.fulfill({status:503,contentType:"application/json",body:JSON.stringify({detail:"Prueba de error"})}));
  await page.goto(base+"/tratamientos");await page.getByRole("alert").waitFor();
  await page.unroute("**/api/agenda/catalog");
  await page.getByRole("button",{name:"Volver a intentar"}).click();await page.locator(".treatment-row").first().waitFor();
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(engine.name(),mobile?"mobile":"desktop","PASS: home, contact, all treatments, booking selection, redirects, missing treatment, retry, no overflow.");
 }
} finally {await browser.close();}
