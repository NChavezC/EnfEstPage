import {chromium} from '../.agenda-local/ui/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const token='a'.repeat(43);
try {
 for(const [url,status,payment] of [
  ['/reservar/resultado?token='+token+'?x_account_id=test&x_result=completed','confirmed','completed'],
  ['/reservar/resultado/'+token+'?x_result=completed','confirmed','completed'],
  ['/reservar/resultado?token='+token,'held','creating'],
  ['/reservar/resultado/'+token+'?x_result=completed','held','ready'],
  ['/reservar/resultado?token='+token,'held','unknown']]) {
  const context=await browser.newContext();
  const page=await context.newPage();
  const lookedUp=[];
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/api/agenda/catalog')return route.fulfill({json:{payment_mode:'tuu'}});
   if(u.pathname.startsWith('/api/agenda/bookings/')){
    lookedUp.push(decodeURIComponent(u.pathname.split('/').pop()));
    return route.fulfill({json:{id:'test',status,starts_at:'2026-11-05T12:00:00Z',expires_at:new Date(Date.now()+600000).toISOString(),treatment:'Test',professional:'Camila Vela-Ruiz',price:100,deposit:100,care:'CUIDADOS PREVIOS',payment:{status:payment,reference:'RTEST'}}});
   }
   if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();
   return route.continue();
  });
  await page.goto('http://localhost:5173'+url,{waitUntil:'domcontentloaded'});
  if(status==='confirmed')await page.getByText('Tu cita está confirmada. Recibirás un correo de confirmación con los detalles de tu reserva.').waitFor();
  if(payment==='creating'){
   await page.getByText('Preparando tu pago con TUU…').waitFor();
   assert.equal(await page.getByText('No pudimos determinar',{exact:false}).count(),0);
  }
  if(status==='held')await page.getByRole('heading',{name:'Por confirmar',exact:true}).waitFor();
  if(payment==='ready') {
   await page.getByText('Estamos verificando tu pago.',{exact:false}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Volver al pago'}).count(),0);
  }
  assert.equal(await page.getByText('Camila Vela-Ruiz',{exact:false}).count(),0);
  if(payment==='unknown')await page.getByText('No pudimos determinar',{exact:false}).waitFor();
  assert(lookedUp.length>0 && lookedUp.every(t=>t===token));
  await context.close();
 }
 console.log('5 browser cases passed: return links, creating, unknown and payment verification; private name absent');
} finally {await browser.close();}
