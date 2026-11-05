import {chromium} from '../.agenda-local/ui/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const categories=[{id:1,name:'Limpieza Facial'},{id:2,name:'Corporal'}];
const services=[{id:1,category_id:1,name:'Limpieza de prueba',duration:120,price:28000,deposit:10000,care:'CUIDADOS',confirmation:'Hola {nombre}',reminder:'Hola {nombre}',reminder_hours:null,active:true,version:1},{id:2,category_id:2,name:'Corporal de prueba',active:true,duration:30,price:20000,deposit:10000,version:1}];
try {
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  let saved;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/api/agenda/catalog')return route.fulfill({json:{categories,services,payment_mode:'tuu'}});
   if(u.pathname==='/api/agenda/availability')return route.fulfill({json:[{starts_at:'2026-12-01T12:00:00Z',ends_at:'2026-12-01T14:00:00Z'}]});
   if(u.pathname==='/api/agenda/admin/session')return route.fulfill({json:{ok:true}});
   if(u.pathname==='/api/agenda/admin/categories') {
    if(route.request().method()==='POST') {const c={id:3,...route.request().postDataJSON()}; categories.push(c);return route.fulfill({status:201,json:c});}
    return route.fulfill({json:categories});
   }
   if(u.pathname==='/api/agenda/admin/services') {
    if(route.request().method()==='POST') {saved=route.request().postDataJSON();return route.fulfill({status:201,json:{id:3}});}
    return route.fulfill({json:services});
   }
   if(u.pathname.startsWith('/api/agenda/admin/'))return route.fulfill({json:[]});
   if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();
   return route.continue();
  });
  await page.goto('http://localhost:5173/reservar');
  await page.getByRole('button',{name:/Limpieza de prueba/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Corporal de prueba/}).count(),0);
  await page.getByRole('button',{name:/Limpieza de prueba/}).click();
  await page.getByLabel('Categoría',{exact:true}).selectOption('2');
  await page.getByRole('button',{name:/Corporal de prueba/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Limpieza de prueba/}).count(),0);
  await page.getByRole('heading',{name:'Selecciona un tratamiento'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto('http://localhost:5173/admin');
  await page.getByRole('button',{name:'Tratamientos y cuidados'}).click();
  const filter=page.getByLabel('Filtrar por categoría');
  await filter.selectOption('1');
  assert.equal(await page.getByText('Corporal de prueba',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Copiar',exact:true}).click();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.getByLabel('Nombre',{exact:true}).inputValue(),'Copia de Limpieza de prueba');
  await dialog.getByRole('button',{name:'Guardar tratamiento'}).click();
  await dialog.waitFor({state:'hidden'});
  assert.equal(saved.id,undefined);
  assert.equal(saved.price,28000);
  await filter.selectOption('');
  await page.getByText('Corporal de prueba',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Crear categoría',exact:true}).click();
  await dialog.getByLabel('Nombre de la categoría').fill('Nueva '+width);
  await dialog.getByRole('button',{name:'Guardar categoría'}).click();
  await page.getByText('Categoría guardada.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Crear tratamiento'}).click();
  await dialog.getByLabel('Categoría',{exact:true}).selectOption('2');
  assert.equal(await dialog.getByLabel('Nombre',{exact:true}).inputValue(),'');
  assert.equal(await dialog.getByLabel('Precio total CLP').inputValue(),'0');
  await dialog.getByLabel('Nombre',{exact:true}).fill('Nuevo facial');
  await dialog.getByLabel('Precio total CLP').fill('20000');
  await dialog.getByLabel('Correo de confirmación',{exact:true}).fill('Texto largo '.repeat(500));
  assert(await dialog.getByLabel('Vista previa del correo de confirmación').evaluate(el=>el.scrollHeight>el.clientHeight));
  await page.getByRole('button',{name:'Guardar tratamiento',exact:true}).click();
  await page.getByText('Tratamiento guardado.',{exact:false}).waitFor();
  assert.equal(saved.category_id,2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  categories.splice(2);
  await context.close();
 }
 console.log('Categories: public filtering and selection reset; admin category/service creation; mobile and desktop passed');
} finally {await browser.close();}
