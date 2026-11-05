import {chromium} from '../.agenda-local/ui/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  let services=[{id:1,category_id:1,name:'Limpieza de prueba',duration:120,price:28000,deposit:10000,care:'CUIDADOS',confirmation:'Hola {nombre}',reminder:'Hola {nombre}',reminder_hours:null,active:true,version:1}];
  let categories=[{id:1,name:'Limpieza Facial'}],deletes=0;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(route.request().method()==='DELETE') {
    deletes++;
    if(u.pathname.endsWith('/categories/1')) {
     if(services.length)return route.fulfill({status:409,json:{detail:'La categoría contiene tratamientos.'}});
     categories=[];
    } else services=[];
    return route.fulfill({json:{ok:true}});
   }
   if(u.pathname.endsWith('/admin/session'))return route.fulfill({json:{ok:true}});
   if(u.pathname.endsWith('/admin/categories'))return route.fulfill({json:categories});
   if(u.pathname.endsWith('/admin/services'))return route.fulfill({json:services});
   if(u.pathname.startsWith('/api/agenda/admin/'))return route.fulfill({json:[]});
   if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();
   return route.continue();
  });
  await page.goto('http://localhost:5173/admin');
  await page.getByRole('button',{name:'Tratamientos y cuidados'}).click();
  await page.getByLabel('Filtrar por categoría').selectOption('1');
  await page.getByRole('button',{name:'Eliminar categoría',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar eliminación'}).click();
  await page.getByRole('dialog').getByRole('alert').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(deletes,1);
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar eliminación'}).click();
  await page.getByText('Eliminado correctamente.',{exact:false}).waitFor();
  assert.equal(await page.getByText('Limpieza de prueba',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Eliminar categoría',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar eliminación'}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await page.getByRole('option',{name:'Limpieza Facial'}).count(),0);
  assert.equal(deletes,3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await context.close();
 }
 console.log('Deletion: confirmation, cancel without mutation, category error, service and empty category removal; mobile and desktop passed');
} finally {await browser.close();}
