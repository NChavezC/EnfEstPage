import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5173";
const engines = process.env.TEST_WEBKIT ? [webkit] : [chromium];
for (const engine of engines) {
 const browser = await engine.launch(engine === chromium ? {executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true} : {headless:true});
 try {
  for (const mobile of [false,true]) {
   const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,timezoneId:"Europe/London"});
   await context.route("**/*",r=>["localhost","127.0.0.1"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
   const page = await context.newPage(); page.setDefaultTimeout(60000);
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   console.log("Opening admin", engine.name(), mobile ? "mobile" : "desktop");
   await page.goto(base+"/admin",{waitUntil:"domcontentloaded",timeout:120000});
   await page.getByLabel("Contraseña",{exact:true}).fill("test-password");
   await page.getByRole("button",{name:"Entrar",exact:true}).click();
   await page.getByRole("button",{name:"Nueva reserva",exact:true}).waitFor();
   console.log("Admin authenticated");
   const d=new Date();d.setUTCDate(d.getUTCDate()+35+(mobile?7:0));d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7));
   const day=d.toISOString().slice(0,10);
   await page.getByLabel("Fecha de agenda").fill(day);
   const available=page.getByRole("button",{name:/Disponible/}); await available.first().waitFor();
   if(mobile) await page.getByRole("button",{name:"Semana",exact:true}).click();
   await available.first().waitFor();
   assert.equal(await page.locator('[data-testid="week-calendar"] h3').count(),7);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'.agenda-local/calendar-'+(mobile?'iphone':'desktop')+'.png',fullPage:true});
   await available.first().click();
   await page.getByRole("button",{name:"Bloquear este horario",exact:true}).click();
   await page.getByRole("dialog").waitFor({state:"hidden"});
   await page.getByRole("button",{name:/Bloqueo/}).first().click();
   assert.equal(await page.getByText("Motivo",{exact:true}).count(),0);
   await page.getByRole("button",{name:"Liberar bloqueo",exact:true}).click();
   await page.getByRole("dialog").waitFor({state:"hidden"});
   await available.first().click();
   await page.getByRole("button",{name:"Reservar este horario",exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('select[required]') && [...document.querySelectorAll('select')].some(s=>s.value.includes('T')));
   const dialog=page.getByRole("dialog");
   const name='Ficticia'+(mobile?'Movil':'Escritorio')+Date.now();
   await dialog.getByLabel("Nombre",{exact:true}).fill(name);
   await dialog.getByLabel("Apellidos",{exact:true}).fill("Calendario");
   await dialog.getByLabel("Fecha de nacimiento",{exact:true}).fill("1992-03-15");
   await dialog.getByLabel("Teléfono",{exact:true}).fill("+56912345678");
   await dialog.getByLabel("Correo",{exact:true}).fill(name.toLowerCase()+"@example.invalid");
   await dialog.getByRole("button",{name:"Confirmar reserva interna",exact:true}).click();
   await dialog.waitFor({state:"hidden"});
   await page.getByRole("button",{name:new RegExp(name)}).click();
   await page.getByRole("button",{name:"Reprogramar",exact:true}).click();
   await page.getByLabel("Hora disponible").selectOption({index:2});
   await page.getByRole("button",{name:"Confirmar nueva hora",exact:true}).click();
   await dialog.waitFor({state:"hidden"});
   await page.getByRole("button",{name:new RegExp(name)}).click();
   await page.getByRole("button",{name:"Cancelar reserva",exact:true}).click();
   await dialog.waitFor({state:"hidden"});
   await available.first().click();await page.getByRole("button",{name:"Reservar este horario",exact:true}).click();
   await page.getByRole("combobox",{name:"Buscar clienta",exact:true}).fill(name);
   const option=page.getByRole("option",{name:new RegExp(name)});await option.waitFor();
   if(mobile) await option.tap(); else {await page.getByRole("combobox",{name:"Buscar clienta",exact:true}).press("ArrowDown");await page.getByRole("combobox",{name:"Buscar clienta",exact:true}).press("Enter");}
   assert.equal(await dialog.getByLabel("Nombre",{exact:true}).inputValue(),name);
   assert.equal(await dialog.getByLabel("Fecha de nacimiento",{exact:true}).inputValue(),"1992-03-15");
   await page.getByRole("button",{name:"Cerrar",exact:true}).click();
   if(mobile) {
    const before=await page.getByRole('heading',{name:/Semana del/}).textContent();
    await page.locator('[data-testid="week-calendar"]').evaluate(el=>{
      // WebKit on Windows does not expose a constructible Touch; supply the gesture coordinates directly.
      const start=new Event('touchstart',{bubbles:true});
      Object.defineProperty(start,'touches',{value:[{clientX:300,clientY:200}]});
      el.dispatchEvent(start);
      const end=new Event('touchend',{bubbles:true});
      Object.defineProperty(end,'changedTouches',{value:[{clientX:80,clientY:205}]});
      el.dispatchEvent(end);
    });
    await page.waitForFunction(old=>document.querySelector('h2').textContent!==old,before);
    await page.getByRole("button",{name:"Semana anterior",exact:true}).click();
    assert.equal(await page.getByRole('heading',{name:/Semana del/}).textContent(),before);
   }
   await page.getByRole("button",{name:"Clientas",exact:true}).click();
   await page.getByLabel("Buscar clientas",{exact:true}).fill(name);
   await page.getByRole("button",{name:"Editar clienta",exact:true}).click();
   await dialog.getByLabel("Apellidos",{exact:true}).fill("Ficha editada");
   await dialog.getByRole("button",{name:"Guardar clienta",exact:true}).click();
   await dialog.waitFor({state:"hidden"});
   await page.getByText(name+" Ficha editada",{exact:true}).waitFor();
   const result=await context.request.get(base+'/api/agenda/admin/operations');
   assert.equal(result.status(),200); assert((await result.json()).audit.some(a=>a.action==='booking.cancelled'));
   assert.deepEqual(errors,[]);
   await context.close();
   console.log('PASS calendar, clients, block/release, move/cancel, audit '+(mobile?'iPhone size/touch':'desktop'));
  }
 } finally {await browser.close();}
}
