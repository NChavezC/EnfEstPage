import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base="http://127.0.0.1:5173";
const engine=process.env.TEST_WEBKIT?webkit:chromium;
const browser=await engine.launch(engine===chromium?{executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true}:{headless:true});
try {
 for(const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  await context.route("**/*",r=>["localhost","127.0.0.1"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const call=async(path,body)=>{
   const r=body?await context.request.post(base+"/api/agenda"+path,{data:body,headers:{Origin:base}}):await context.request.get(base+"/api/agenda"+path);
   assert(r.ok(),await r.text());return r.json();
  };
  await page.goto(base+"/home");assert.match(await page.locator("#enfoque").innerText(),/Me tomo el tiempo/);
  await page.getByRole("link",{name:"Explora los tratamientos",exact:true}).first().click();
  await page.locator(".treatment-row").first().waitFor();
  const styles=await page.evaluate(()=>{
   const c=getComputedStyle(document.querySelector(".treatment-category h2")),t=getComputedStyle(document.querySelector(".treatment-row h3"));
   return [c.fontFamily,t.fontFamily,c.textTransform,parseFloat(c.fontSize)>parseFloat(t.fontSize)];
  });assert.equal(styles[0],styles[1]);assert.equal(styles[2],"capitalize");assert.equal(styles[3],true);
  await page.locator(".treatment-row").first().click();await page.getByTestId("treatment-description").waitFor();
  assert.equal(await page.getByText("Sobre el tratamiento.",{exact:true}).count(),0);
  assert.equal(await page.getByText("Prepara tu piel.",{exact:true}).count(),0);
  await page.getByText("ANTES DE TU VISITA",{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector(".treatment-page h1")).fontFamily===getComputedStyle(document.querySelector('[data-testid="treatment-description"]')).fontFamily),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`.agenda-local/free-public-${engine.name()}-${mobile}.png`,fullPage:true});
  await page.goto(base+"/admin");await page.getByLabel("Contraseña",{exact:true}).fill("test-password");await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await page.getByRole("button",{name:"Nueva reserva",exact:true}).waitFor();
  const date=new Date();date.setUTCDate(date.getUTCDate()+80+(mobile?7:0)+(engine===webkit?14:0));date.setUTCDate(date.getUTCDate()+(7-date.getUTCDay())%7);
  const day=date.toISOString().slice(0,10);
  for(const b of await call(`/admin/bookings?start=${day}&end=${day}`)) if(["confirmed","held","blocked"].includes(b.status) && (b.customer.first_name==="LibrePrueba"||b.notes==="LibrePrueba")) await call(`/admin/bookings/${b.id}/cancel`,{revision:b.revision});
  await page.getByLabel("Fecha de agenda").fill(day);await page.getByRole("button",{name:"Día",exact:true}).click();
  const free=page.getByRole("button",{name:`Reservar el ${day} a las 03:00`,exact:true});await free.scrollIntoViewIfNeeded();
  if(mobile)await free.tap({position:{x:20,y:20}});else await free.click({position:{x:20,y:20}});
  await page.getByRole("button",{name:"Reservar este horario",exact:true}).click();
  const dialog=page.getByRole("dialog");assert.equal(await dialog.getByLabel("Fecha",{exact:true}).inputValue(),day);
  assert.equal(await dialog.getByLabel("Hora",{exact:true}).inputValue(),"03:15");
  await dialog.getByLabel("Hora",{exact:true}).fill("03:17");
  await dialog.getByLabel("Nombre",{exact:true}).fill("LibrePrueba");await dialog.getByLabel("Apellidos",{exact:true}).fill("Calendario");
  await dialog.getByLabel("Teléfono",{exact:true}).fill("+56912345678");await dialog.getByLabel("Correo",{exact:true}).fill("libre@example.invalid");
  await dialog.getByRole("button",{name:"Confirmar reserva interna"}).click();await dialog.waitFor({state:"hidden"});
  let booking=(await call(`/admin/bookings?start=${day}&end=${day}`)).find(b=>b.status==="confirmed"&&b.customer.first_name==="LibrePrueba");assert(booking);
  // Long press and move to an arbitrary time on a closed day.
  const card=page.locator(`[data-booking-id="${booking.id}"]`);await card.scrollIntoViewIfNeeded();
  const box=await card.boundingBox();const origin={x:box.x+box.width/2,y:box.y+25};
  const touch=async(type,p)=>page.locator('[data-testid="week-calendar"]').evaluate((el,{type,p})=>{
    const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,"touches",{value:type==="touchend"?[]:[{clientX:p.x,clientY:p.y}]});Object.defineProperty(e,"changedTouches",{value:[{clientX:p.x,clientY:p.y}]});
    (type==="touchstart"?document.elementFromPoint(p.x,p.y):el).dispatchEvent(e);
  },{type,p});
  if(mobile)await touch("touchstart",origin);else {await page.mouse.move(origin.x,origin.y);await page.mouse.down();}
  await page.locator(".calendar-drag-toolbar").waitFor();
  const target={x:origin.x,y:origin.y+90};if(mobile)await touch("touchmove",target);else await page.mouse.move(target.x,target.y);
  await page.locator(".calendar-drop-selected").waitFor();
  if(mobile)await touch("touchend",target);else await page.mouse.up();
  await page.waitForFunction(id=>!document.querySelector(`[data-booking-id="${id}"]`)?.classList.contains("calendar-drag-source"),booking.id);
  await page.waitForTimeout(1000);
  const moved=(await call(`/admin/bookings?start=${day}&end=${day}`)).find(b=>b.id===booking.id);assert.equal(moved.revision,2);assert.notEqual(moved.starts_at,booking.starts_at);booking=moved;
  await card.click();await page.getByRole("button",{name:"Reprogramar",exact:true}).click();await dialog.getByLabel("Hora",{exact:true}).fill("23:47");
  await dialog.getByRole("button",{name:"Confirmar nueva hora"}).click();await dialog.waitFor({state:"hidden"});
  await page.screenshot({path:`.agenda-local/free-calendar-${engine.name()}-${mobile}.png`});
  booking=(await call(`/admin/bookings?start=${day}&end=${day}`)).find(b=>b.id===booking.id);
  await call(`/admin/bookings/${booking.id}/cancel`,{revision:booking.revision});
  assert.deepEqual(errors,[]);console.log(engine.name(),mobile?"iPhone":"desktop","public styles + free tap + minute edit + drag + move + cancel OK");await context.close();
 }
}finally{await browser.close();}
