import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5173";
const engine = process.env.TEST_WEBKIT ? webkit : chromium;
const browser = await engine.launch(engine === chromium ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true } : { headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({viewport: mobile ? {width:390,height:844} : {width:1440,height:1000},hasTouch:mobile,isMobile:mobile,timezoneId:"Europe/London"});
    await context.route("**/*",r => ["localhost","127.0.0.1"].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const call = async (path,body) => {
      const r = body ? await context.request.post(base+"/api/agenda"+path,{data:body,headers:{Origin:base}}) : await context.request.get(base+"/api/agenda"+path);
      assert(r.ok(),await r.text());return r.json();
    };
    const d=new Date();d.setUTCDate(d.getUTCDate()+49+(mobile?7:0)+(engine===webkit?14:0));d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7));
    const day=d.toISOString().slice(0,10);
    const plus=n=>{const x=new Date(day+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
    let id, blocker, holding=false;
    async function touch(type,point,target) {
      await (target || page.locator('[data-testid="week-calendar"]')).evaluate((el,{type,point})=>{
        const event=new Event(type,{bubbles:true,cancelable:true});
        Object.defineProperty(event,"touches",{value:type==="touchend"||type==="touchcancel"?[]:[{clientX:point.x,clientY:point.y}]});
        Object.defineProperty(event,"changedTouches",{value:[{clientX:point.x,clientY:point.y}]});
        el.dispatchEvent(event);
      },{type,point});
    }
    async function startDrag() {
      const card=page.locator('[data-booking-id="'+id+'"]');
      await card.scrollIntoViewIfNeeded(); const b=await card.boundingBox();
      const view=await page.locator('[data-testid="week-calendar"]').boundingBox();
      const p={x:b.x+b.width/2,y:Math.max(b.y+25,view.y+65)};
      if(mobile && engine===chromium) {
        const cdp=await context.newCDPSession(page); context.touchCDP=cdp;
        await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[p]});
      } else if(mobile) await touch("touchstart",p,card);
      else {await page.mouse.move(p.x,p.y);await page.mouse.down();}
      holding=true;
      await page.locator(".calendar-drag-toolbar").waitFor();
      await page.locator("[data-drop-start]").first().waitFor();
      return p;
    }
    async function moveTo(p) {
      if(mobile && engine===chromium) await context.touchCDP.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[p]});
      else if(mobile) await touch("touchmove",p);
      else await page.mouse.move(p.x,p.y,{steps:5});
    }
    async function release(p) {
      if(mobile && engine===chromium) {await context.touchCDP.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await context.touchCDP.detach();}
      else if(mobile) await touch("touchend",p);
      else await page.mouse.up();
      holding=false;
    }
    async function aim(iso) {
      const target=page.locator('[data-drop-start="'+iso+'"]');
      await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();
      const view=await page.locator('[data-testid="week-calendar"]').boundingBox();
      const p={x:b.x+b.width/2,y:Math.max(b.y+25,view.y+65)};await moveTo(p);
      await page.locator(".calendar-drop-selected").waitFor();return p;
    }
    async function row() {return (await call("/admin/bookings?start="+day+"&end="+plus(6))).find(b=>b.id===id);}
    try {
      await page.goto(base+"/admin",{waitUntil:"domcontentloaded",timeout:120000});
      await page.getByLabel("Contraseña",{exact:true}).fill("test-password");await page.getByRole("button",{name:"Entrar",exact:true}).click();
      await page.getByRole("button",{name:"Nueva reserva",exact:true}).waitFor();
      assert.equal(await page.getByRole("button",{name:mobile?"Día":"Semana",exact:true}).getAttribute("aria-pressed"),"true");
      // Remove only fixtures from an interrupted run in this isolated UI database.
      for(const b of await call("/admin/bookings?start="+day+"&end="+plus(6))) {
        if(["held","confirmed","blocked"].includes(b.status) && (b.customer.first_name?.startsWith("GrillaPrueba") || b.notes==="GrillaPrueba"))
          await call("/admin/bookings/"+b.id+"/cancel",{revision:b.revision});
      }
      const plan={closed:false,starts:["09:00","11:10","13:40"],shift_start:"09:00",shift_end:"18:00",duration:120,buffer:10,final_buffer:false,breaks:[{start:"13:10",end:"13:40"}]};
      for(const n of [0,1,2]) {
        const r=await call("/admin/schedule?preview=false",{specific_date:plus(n),effective_from:plus(n),plan:n===2?{closed:true}:plan});assert.equal(r.saved,true);
      }
      const service=(await call("/admin/services")).find(s=>s.active && s.duration===120);
      const slots=await call("/admin/availability?day="+day+"&service_id="+service.id);
      const next=await call("/admin/availability?day="+plus(1)+"&service_id="+service.id);
      const b=await call("/admin/bookings",{service_id:service.id,service_version:service.version,starts_at:slots[0].starts_at,customer:{first_name:"GrillaPrueba"+Date.now(),last_name:"Ficticia",email:"grilla@example.invalid",phone:"+56912345678",birth_date:null}});
      id=b.id;
      await page.getByLabel("Fecha de agenda").fill(day);
      await page.getByRole("button",{name:"3 días",exact:true}).click();
      await page.locator('[data-booking-id="'+id+'"]').waitFor();
      assert.equal(await page.locator('[data-calendar-day]').count(),3);
      assert.equal(await page.locator(".calendar-break").count(),2);
      assert.equal(await page.locator(".calendar-closed").count(),1);
      assert.equal(await page.locator('[data-booking-id="'+id+'"]').evaluate(el=>parseFloat(el.style.height)),150);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:".agenda-local/time-grid-"+engine.name()+"-"+(mobile?"mobile":"desktop")+".png",fullPage:true});
      // Short tap opens details, never a move.
      if(mobile) await page.locator('[data-booking-id="'+id+'"]').tap();else await page.locator('[data-booking-id="'+id+'"]').click();
      await page.getByRole("dialog").waitFor();assert.equal((await row()).revision,1);
      await page.getByRole("button",{name:"Cerrar",exact:true}).click();
      // A normal finger scroll over a reservation must scroll, not activate a drag.
      if (mobile && engine === chromium) {
        const card=page.locator('[data-booking-id="'+id+'"]');await card.scrollIntoViewIfNeeded();
        const b=await card.boundingBox();const scroller=page.locator('[data-testid="week-calendar"]');
        const before=await scroller.evaluate(el=>el.scrollTop);const cdp=await context.newCDPSession(page);
        const x=b.x+b.width/2,y=b.y+110;
        await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
        for(const delta of [20,45,75]) await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y:y-delta}]});
        await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();
        await page.waitForFunction(before=>document.querySelector('[data-testid="week-calendar"]').scrollTop>before+5,before);
        assert.equal(await page.locator('.calendar-drag-toolbar').count(),0);assert.equal((await row()).revision,1);
      }
      // Long press + drop in a different day.
      await startDrag();let p=await aim(next[0].starts_at);await release(p);
      await page.waitForFunction(id=>document.querySelector('[data-booking-id="'+id+'"]')?.closest('[data-calendar-day]')?.dataset.calendarDay===document.querySelectorAll('[data-calendar-day]')[1].dataset.calendarDay,id);
      assert.equal((await row()).revision,2);
      // Invalid destination and Escape must not change the booking.
      await startDrag();const closed=await page.locator('[data-calendar-day="'+plus(2)+'"]').boundingBox();
      const viewBox=await page.locator('[data-testid="week-calendar"]').boundingBox();
      p={x:closed.x+closed.width/2,y:viewBox.y+100};await moveTo(p);await release(p);
      assert.equal((await row()).revision,2);
      p=await startDrag();await page.keyboard.press("Escape");await release(p);assert.equal((await row()).revision,2);
      // Occupy a highlighted target after availability was fetched: the server must reject the drop.
      await startDrag();p=await aim(slots[0].starts_at);
      blocker=(await call("/admin/blocks",{starts_at:slots[0].starts_at,ends_at:slots[0].occupied_until,reason:"GrillaPrueba"})).id;
      await release(p);
      await page.getByRole("alert").filter({hasText:"Horario no disponible"}).waitFor();
      assert.equal((await row()).revision,2);
      await call("/admin/bookings/"+blocker+"/cancel",{revision:1});blocker=null;
      const audit=(await call("/admin/operations")).audit.filter(a=>a.entity===id && a.action==="booking.moved");
      assert.equal(audit.length,1);
      // Three views and horizontal navigation remain available.
      await page.getByRole("button",{name:"Día",exact:true}).click();assert.equal(await page.locator('[data-calendar-day]').count(),1);
      const heading=await page.getByRole("heading",{name:/Día /}).textContent();
      const box=await page.locator('[data-testid="week-calendar"]').boundingBox();
      await touch("touchstart",{x:box.x+box.width-25,y:box.y+65});
      await touch("touchend",{x:box.x+55,y:box.y+65});
      await page.waitForFunction(h=>document.querySelector("h2").textContent!==h,heading);
      await page.getByRole("button",{name:"Período anterior",exact:true}).click();
      assert.equal(await page.getByRole("heading",{name:/Día /}).textContent(),heading);
      await page.getByRole("button",{name:"Semana",exact:true}).click();assert.equal(await page.locator('[data-calendar-day]').count(),7);
      assert.deepEqual(errors,[]);
      console.log("PASS time grid, hold/drag, invalid drop, Escape, concurrent conflict, audit, views and swipe:",engine.name(),mobile?"mobile":"desktop");
    } catch(e) {
      await page.screenshot({path:".agenda-local/grid-failure-"+engine.name()+"-"+mobile+".png",fullPage:true}).catch(()=>{});
      console.error(await page.locator("body").innerText().catch(()=>""));
      throw e;
    } finally {
      if(holding) {if(!mobile) await page.mouse.up().catch(()=>{});else if(context.touchCDP) await context.touchCDP.send("Input.dispatchTouchEvent",{type:"touchCancel",touchPoints:[]}).catch(()=>{});}
      if(id) {const b=await row().catch(()=>null);if(b?.status==="confirmed") await call("/admin/bookings/"+id+"/cancel",{revision:b.revision});}
      if(blocker) await call("/admin/bookings/"+blocker+"/cancel",{revision:1});
      await context.close();
    }
  }
} finally {await browser.close();}
