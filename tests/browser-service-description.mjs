import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base="http://127.0.0.1:5173";
const engine=process.env.TEST_WEBKIT?webkit:chromium;
const browser=await engine.launch(engine===chromium?{executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true}:{headless:true});
try {
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  await context.route("**/*",r=>["localhost","127.0.0.1"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const catalog=await(await context.request.get(base+"/api/agenda/catalog")).json();
  for(const s of catalog.services){
   assert.equal(typeof s.description,"string");
   await page.goto(base+"/tratamientos/"+s.id);
   assert.equal(await page.getByTestId("treatment-description").innerText(),s.description);
  }
  const service=catalog.services[0];
  await page.goto(base+"/admin");
  await page.getByLabel("Contraseña",{exact:true}).fill("test-password");
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await page.getByRole("button",{name:"Tratamientos y cuidados",exact:true}).click();
  const item=page.locator("li").filter({has:page.getByText(service.name,{exact:true})});
  await item.getByRole("button",{name:"Editar",exact:true}).click();
  const text="Descripción independiente\nSegunda línea <b>texto literal</b>";
  const dialog=page.getByRole("dialog");
  assert.equal(await dialog.getByLabel("Descripción para la web",{exact:true}).inputValue(),service.description);
  const care=await dialog.getByLabel("Cuidados previos",{exact:true}).inputValue();
  await dialog.getByLabel("Descripción para la web",{exact:true}).fill(text);
  await dialog.getByRole("button",{name:"Guardar tratamiento",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await item.getByRole("button",{name:"Editar",exact:true}).click();
  assert.equal(await dialog.getByLabel("Descripción para la web",{exact:true}).inputValue(),text);
  assert.equal(await dialog.getByLabel("Cuidados previos",{exact:true}).inputValue(),care);
  await page.goto(base+"/tratamientos/"+service.id);
  assert.equal(await page.getByTestId("treatment-description").innerText(),text);
  assert.equal(await page.getByTestId("treatment-description").locator("b").count(),0);
  await page.getByRole("link",{name:"Reservar este tratamiento"}).click();
  let chosenDay;
  for(let i=14;i<28;i++){
   const date=new Date();date.setDate(date.getDate()+i);const day=date.toISOString().slice(0,10);
   const slots=await(await context.request.get(base+"/api/agenda/availability?day="+day+"&service_id="+service.id)).json();
   if(slots.length){chosenDay=day;break;}
  }
  assert.ok(chosenDay);
  await page.getByLabel("Fecha",{exact:true}).fill(chosenDay);
  await page.getByRole("button",{name:/^\d\d:\d\d – \d\d:\d\d$/}).first().click();
  for(const [label,value] of [["Nombre","Ficticia"],["Apellidos","Descripción"],["Correo electrónico","description@example.invalid"],["Teléfono","+56912345678"]])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole("button",{name:"Revisar cuidados y continuar"}).click();
  assert.ok((await page.getByRole("dialog").innerText()).includes(care));
  assert.ok(!(await page.getByRole("dialog").innerText()).includes("Descripción independiente"));
  assert.ok(!(await page.getByRole("dialog").innerText()).includes("PRUEBA DESCRIPCIÓN"));
  const services=await(await context.request.get(base+"/api/agenda/admin/services")).json();
  const original=services.find(s=>s.id===service.id);
  const {id,version,...body}=original;void version;
  const restored=await context.request.put(base+"/api/agenda/admin/services/"+id,{headers:{Origin:base},data:{...body,description:service.description}});
  assert.equal(restored.status(),200);
  await context.close();
  console.log(engine.name(),mobile?"mobile":"desktop","PASS: all descriptions, persisted edit, literal text, unchanged care, description absent from checkout dialog.");
 }
}finally{await browser.close();}
