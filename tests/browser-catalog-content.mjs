import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base="http://127.0.0.1:5173";
const source=JSON.parse(await fs.readFile("api/agenda/catalog_content.json","utf8"));
const engine=process.env.TEST_WEBKIT?webkit:chromium;
const browser=await engine.launch(engine===chromium?{executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true}:{headless:true});
try {
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  await context.route("**/*",r=>["127.0.0.1","localhost"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const catalog=await(await context.request.get(base+"/api/agenda/catalog")).json();
  const paths=new Set(source.entries.flatMap(e=>e.images));
  for(const path of paths){
   const response=await context.request.get(base+path);
   assert.equal(response.status(),200,path);
   assert.match(response.headers()["content-type"],/^image\//);
  }
  for(const entry of source.entries)for(const name of entry.service_names){
   const service=catalog.services.find(s=>s.name===name);assert.ok(service,name);
   assert.equal(service.description,entry.description);assert.deepEqual(service.images,entry.images);
   await page.goto(base+"/tratamientos/"+service.id);
   await page.getByRole("heading",{name,exact:true}).waitFor();
   assert.equal(await page.getByTestId("treatment-description").innerText(),entry.description);
   await page.locator(".treatment-gallery").waitFor();
   assert.deepEqual(await page.locator(".treatment-gallery img").evaluateAll(images=>images.map(i=>i.getAttribute("src"))),entry.images);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  const service=catalog.services.find(s=>s.name==="Limpieza facial profunda");
  await page.goto(base+"/tratamientos/"+service.id);
  await page.locator(".treatment-gallery").scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll(".treatment-gallery img")].every(i=>i.complete&&i.naturalWidth>0));
  await page.locator(".treatment-gallery img").evaluateAll(async images=>{await Promise.all(images.map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.screenshot({path:".agenda-local/catalog-import/treatment-"+engine.name()+"-"+(mobile?"mobile":"desktop")+".png",fullPage:true});
  await page.goto(base+"/admin");
  await page.getByLabel("Contraseña",{exact:true}).fill("test-password");
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await page.getByRole("button",{name:"Tratamientos y cuidados",exact:true}).click();
  const item=page.locator("li").filter({has:page.getByText(service.name,{exact:true})});
  await item.getByRole("button",{name:"Editar",exact:true}).click();
  const dialog=page.getByRole("dialog");
  assert.equal(await dialog.getByLabel("Fotos para la web",{exact:true}).inputValue(),service.images.join("\n"));
  await dialog.getByLabel("Fotos para la web",{exact:true}).fill("/tratamientos/no-existe.jpg");
  await dialog.getByText("Imagen no disponible. Revisa la ruta del archivo.").waitFor();
  await dialog.getByLabel("Fotos para la web",{exact:true}).fill([...service.images].reverse().join("\n"));
  await dialog.getByLabel("Descripción para la web",{exact:true}).fill("Descripción editable de prueba");
  await dialog.getByRole("button",{name:"Guardar tratamiento",exact:true}).click();await dialog.waitFor({state:"hidden"});
  await item.getByRole("button",{name:"Editar",exact:true}).click();
  assert.equal(await dialog.getByLabel("Fotos para la web",{exact:true}).inputValue(),[...service.images].reverse().join("\n"));
  assert.equal(await dialog.getByLabel("Cuidados previos",{exact:true}).inputValue(),service.care);
  await dialog.getByLabel("Fotos para la web",{exact:true}).fill(service.images[1]);
  await dialog.getByRole("button",{name:"Guardar tratamiento",exact:true}).click();await dialog.waitFor({state:"hidden"});
  await page.goto(base+"/tratamientos/"+service.id);
  assert.equal(await page.getByTestId("treatment-description").innerText(),"Descripción editable de prueba");
  assert.equal(await page.locator(".treatment-gallery img").count(),1);
  assert.equal(await page.locator(".treatment-gallery img").getAttribute("src"),service.images[1]);
  await page.getByRole("link",{name:"Reservar este tratamiento"}).click();
  let day;
  for(let offset=14;offset<28;offset++){
   const d=new Date();d.setDate(d.getDate()+offset);const candidate=d.toISOString().slice(0,10);
   const slots=await(await context.request.get(base+"/api/agenda/availability?day="+candidate+"&service_id="+service.id)).json();
   if(slots.length){day=candidate;break;}
  }
  assert.ok(day);await page.getByLabel("Fecha",{exact:true}).fill(day);
  await page.getByRole("button",{name:/^\d\d:\d\d – \d\d:\d\d$/}).first().click();
  for(const [label,value] of [["Nombre","Ficticia"],["Apellidos","Catálogo"],["Correo electrónico","catalog@example.invalid"],["Teléfono","+56912345678"]])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole("button",{name:"Revisar cuidados y continuar"}).click();
  assert.ok((await dialog.innerText()).includes(service.care));
  assert.ok(!(await dialog.innerText()).includes("Descripción editable de prueba"));
  assert.equal(await dialog.locator("img").count(),0);
  const services=await(await context.request.get(base+"/api/agenda/admin/services")).json();
  const current=services.find(s=>s.id===service.id);const {id,version,...body}=current;void version;
  assert.equal((await context.request.put(base+"/api/agenda/admin/services/"+id,{headers:{Origin:base},data:{...body,description:service.description,images:service.images}})).status(),200);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(engine.name(),mobile?"mobile":"desktop","PASS: 29 treatment pages, 39 image files, admin edit/reorder/remove, missing image preview, care-only checkout.");
 }
} finally {await browser.close();}
