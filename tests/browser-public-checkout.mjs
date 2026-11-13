import { chromium } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base="http://127.0.0.1:5173";
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.route("**/*",r=>["localhost","127.0.0.1"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const page=await context.newPage();page.setDefaultTimeout(60000);
let booking;
try{
 const catalog=await (await context.request.get(base+"/api/agenda/catalog")).json();
 assert.equal(catalog.payment_mode,"mock");
 const service=catalog.services[0];
 let chosenDay;
 for(let offset=14;offset<28;offset++){
  const date=new Date();date.setDate(date.getDate()+offset);
  const day=date.toISOString().slice(0,10);
  const slots=await (await context.request.get(base+"/api/agenda/availability?day="+day+"&service_id="+service.id)).json();
  if(slots.length){chosenDay=day;break;}
 }
 assert.ok(chosenDay);
 await page.goto(base+"/tratamientos/"+service.id);
 await page.getByRole("link",{name:"Reservar este tratamiento"}).click();
 await page.getByLabel("Fecha",{exact:true}).fill(chosenDay);
 await page.getByRole("button",{name:/^\d\d:\d\d – \d\d:\d\d$/}).first().click();
 await page.getByLabel("Nombre",{exact:true}).fill("PruebaRediseño");
 await page.getByLabel("Apellidos",{exact:true}).fill("Ficticia");
 await page.getByLabel("Correo electrónico",{exact:true}).fill("redesign@example.invalid");
 await page.getByLabel("Teléfono",{exact:true}).fill("+56912345678");
 await page.getByRole("button",{name:"Revisar cuidados y continuar"}).click();
 assert.ok(await page.getByRole("button",{name:"Continuar al pago",exact:true}).isDisabled());
 await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Continuar al pago",exact:true}).click();
 await page.waitForURL(/reservar\/resultado/);
 const token=new URL(page.url()).searchParams.get("token");
 await page.getByRole("button",{name:"Pagar abono y confirmar"}).click();
 await page.getByRole("button",{name:"Simular pago aprobado"}).waitFor();
 await page.getByRole("button",{name:"Simular pago aprobado"}).click();
 await page.getByRole("heading",{name:"Confirmada",exact:true}).waitFor();
 booking=await (await context.request.get(base+"/api/agenda/bookings/"+token)).json();
 assert.equal(booking.status,"confirmed");
 await page.goto(base+"/admin");
 await page.getByLabel("Contraseña",{exact:true}).fill("test-password");
 await page.getByRole("button",{name:"Entrar",exact:true}).click();
 await page.getByRole("button",{name:"Nueva reserva",exact:true}).waitFor();
 await page.getByLabel("Fecha de agenda").fill(chosenDay);
 await page.locator('[data-booking-id="'+booking.id+'"]').click();
 await page.getByRole("button",{name:"Cancelar reserva",exact:true}).click();
 await page.getByRole("dialog").waitFor({state:"hidden"});
 while(await page.getByRole("button",{name:/PruebaRediseño Ficticia/}).count()){
  await page.getByRole("button",{name:/PruebaRediseño Ficticia/}).first().click();
  await page.getByRole("button",{name:"Cancelar reserva",exact:true}).click();
  await page.getByRole("dialog").waitFor({state:"hidden"});
 }
 console.log("PASS: treatment → booking → care acceptance → mock payment → confirmed → admin cancellation.");
}finally{await browser.close();}
