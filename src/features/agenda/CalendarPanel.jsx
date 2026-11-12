import { useEffect, useRef, useState } from "react";
import { api, post, dateKey, clock, dateLabel, addDays, chileISO, labels, money } from "./api";
import Modal from "./Modal";
import CustomerPicker, { CustomerFields } from "./CustomerPicker";
import { customerPayload, emptyCustomer } from "./customerData";
const button = "rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 font-semibold disabled:opacity-50";
export default function CalendarPanel() {
  const [anchor, setAnchor] = useState(dateKey());
  const [bookings, setBookings] = useState([]), [services, setServices] = useState([]), [week, setWeek] = useState([]);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [updated, setUpdated] = useState(null);
  const [modal, setModal] = useState(null), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false);
  const [day, setDay] = useState(dateKey()), [serviceId, setServiceId] = useState(""), [slots, setSlots] = useState([]), [slot, setSlot] = useState("");
  const [customer, setCustomer] = useState({...emptyCustomer}), [profile, setProfile] = useState(null), [notes, setNotes] = useState("");
  const [blockStart, setBlockStart] = useState("09:00"), [blockEnd, setBlockEnd] = useState("11:00"), [picked, setPicked] = useState(null);
  const pendingSlot = useRef(null), touch = useRef(null), submitting = useRef(false), generation = useRef(0), suppressClick = useRef(false);
  const weekOffset = (new Date(anchor + "T12:00:00Z").getUTCDay() + 6) % 7;
  const start = addDays(anchor, -weekOffset), end = addDays(start, 6);
  const dates = Array.from({length: 7}, (_, i) => addDays(start, i));
  const service = services.find(s => s.id === Number(serviceId));
  async function reload() {
    const token = ++generation.current;
    const [rows, availability] = await Promise.all([api("/admin/bookings?start=" + start + "&end=" + end), api("/admin/availability/week?start=" + start + "&end=" + end)]);
    if (token !== generation.current) return;
    setBookings(rows); setWeek(availability); setUpdated(new Date());
  }
  useEffect(() => {
    let active = true;
    setBookings([]); setWeek([]); setUpdated(null);
    const refresh = () => {
      if (submitting.current) return;
      const token = ++generation.current;
      Promise.all([api("/admin/bookings?start=" + start + "&end=" + end), api("/admin/availability/week?start=" + start + "&end=" + end)]).then(([rows, availability]) => {
        if (active && token === generation.current) { setBookings(rows); setWeek(availability); setUpdated(new Date()); }
      }).catch(e => { if (active) setError("No se pudo actualizar la agenda: " + e.message); });
    };
    refresh(); const timer = setInterval(refresh, 15000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [start, end]);
  useEffect(() => { api("/admin/services").then(setServices).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!["new", "move"].includes(modal) || !serviceId || !day) return;
    let active = true; setSlots([]); setSlot("");
    api("/admin/availability?day=" + day + "&service_id=" + serviceId + (modal === "move" ? "&exclude=" + selected.id : "")).then(data => {
      if (!active) return;
      setSlots(data);
      const match = data.find(s => new Date(s.starts_at).getTime() === new Date(pendingSlot.current).getTime());
      if (match) setSlot(match.starts_at);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [modal, day, serviceId, selected]);
  function openNew(value = null) {
    const chosen = value?.starts_at ? value : null;
    setSelected(null); setDay(chosen ? dateKey(chosen.starts_at) : anchor);
    pendingSlot.current = chosen?.starts_at || null;
    setServiceId(String(services.find(s => s.active)?.id || ""));
    setCustomer({...emptyCustomer}); setProfile(null); setNotes(""); setError(""); setModal("new");
  }
  async function perform(action) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await action();
      try { await reload(); } catch (e) { setError("El cambio se guardó, pero no se pudo actualizar la vista: " + e.message); }
      setModal(null); setMessage(result?.message || "Agenda actualizada.");
    }
    catch (e) { setError(e.message); if (e.status === 409) await reload().catch(() => {}); }
    finally { submitting.current = false; setBusy(false); }
  }
  function create(e) {
    e.preventDefault();
    perform(() => post("/admin/bookings", { service_id: service.id, service_version: service.version, starts_at: slot,
      customer: customerPayload(customer), customer_id: profile?.id || null, customer_version: profile?.version || null, accepted_care: false, notes }));
  }
  function detail(b) { setSelected(b); setError(""); setModal("detail"); }
  return <section className="rounded-2xl border bg-[var(--color-surface)] p-3 sm:p-5 min-w-0">
    <div className="flex flex-wrap gap-2 items-center justify-between">
      <div className="flex gap-2"><button className={button} aria-label="Semana anterior" onClick={() => setAnchor(addDays(anchor,-7))}>←</button><button className={button} onClick={() => setAnchor(dateKey())}>Hoy</button><button className={button} aria-label="Semana siguiente" onClick={() => setAnchor(addDays(anchor,7))}>→</button></div>
      <input type="date" required aria-label="Fecha de agenda" className="rounded-lg border p-3 min-w-0" value={anchor} onChange={e => { if(e.target.value) setAnchor(e.target.value); }} />
      <div className="flex gap-2 flex-wrap"><button className={button} disabled={!services.some(s => s.active)} onClick={() => openNew()}>Nueva reserva</button><button className={button} onClick={() => { setDay(anchor); setError(""); setModal("block"); }}>Bloquear horario</button></div>
    </div>
    <h2 className="my-4 font-semibold" aria-live="polite">Semana del {start.split("-").reverse().join("/")} al {end.split("-").reverse().join("/")}</h2>
    <p className="text-sm text-[var(--color-muted)] mb-3">America/Santiago · {updated ? "Actualizada a las " + clock(updated) : "Cargando…"}. Desliza horizontalmente para cambiar de semana.</p>
    {error && !modal && <p role="alert" className="my-3 rounded-lg bg-red-50 text-red-800 p-3">{error}</p>}
    {message && <p role="status" className="my-3 rounded-lg bg-green-50 p-3">{message}</p>}
    <div data-testid="week-calendar" className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-7 gap-2 mb-5" style={{touchAction:"pan-y"}}
      onTouchStart={e => { if(e.touches.length === 1) { touch.current = {x:e.touches[0].clientX,y:e.touches[0].clientY}; suppressClick.current=false; } }}
      onTouchCancel={() => { touch.current=null; }}
      onTouchEnd={e => { if (!touch.current) return; const dx=e.changedTouches[0].clientX-touch.current.x, dy=e.changedTouches[0].clientY-touch.current.y; touch.current=null; if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) { suppressClick.current=true; setAnchor(a=>addDays(a,dx<0?7:-7)); } }}
      onClickCapture={e => { if(suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current=false; } }}>
      {dates.map(d => {
        const available = week.find(w => w.day === d)?.slots || [];
        const existing = bookings.filter(b => ["held","confirmed","blocked","payment_review"].includes(b.status) && dateKey(b.starts_at)<=d && dateKey(b.ends_at)>=d);
        const entries = [...available.map(s => ({...s,available:true})),...existing].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
        return <div key={d} className={"rounded-xl border p-2 min-w-0 " + (d===dateKey()?"border-[var(--color-primary)]":"border-slate-200")}>
          <h3 className="font-semibold text-sm py-2">{new Date(d+"T12:00:00Z").toLocaleDateString("es-CL",{weekday:"short",day:"numeric",month:"short",timeZone:"America/Santiago"})}</h3>
          <div className="grid gap-2">{entries.map(item => <button key={item.id || item.starts_at} className={"rounded-lg border p-3 text-left text-xs min-h-[64px] break-words " + (item.available?"bg-green-50 border-green-300 text-green-900":item.status==="blocked"?"bg-slate-100 border-slate-300":item.status==="held"?"bg-amber-50 border-amber-400 border-dashed":"bg-[var(--color-surface-soft)] border-[var(--color-primary)]")}
            onClick={() => { if(item.available) { setPicked(item); setError(""); setModal("slot"); } else detail(item); }}>
            <strong className="block">{clock(item.starts_at)} – {clock(item.ends_at)}</strong>
            {item.available ? <span>Disponible</span> : <><strong className="block mt-1">{item.status==="blocked"?"Bloqueo":item.customer.first_name+" "+item.customer.last_name}</strong><span className="block">{item.snapshot.name}</span><span>{labels[item.status]}</span></>}
          </button>)}</div>
          {!entries.length && <p className="text-xs text-slate-500 py-3">{updated ? "Sin disponibilidad" : "Cargando…"}</p>}
        </div>;
      })}
    </div>
    <details><summary>Historial del período ({bookings.length})</summary><div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Cita</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Cliente</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Estado</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top"></th></tr></thead><tbody>{bookings.map(b => <tr key={b.id}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{dateLabel(b.starts_at)}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{b.customer.first_name || "Bloqueo"}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{labels[b.status]}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top"><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
                  setSelected(b);

                  setModal("detail");
                }}>Ver</button></td></tr>)}</tbody></table></div></details>
    {modal && <Modal title={{
      new: "Nueva reserva interna",
      detail: "Detalle de la reserva",
      move: "Reprogramar cita",
      block: "Bloquear horario",
      slot: "Horario disponible"
    }[modal]} onClose={() => {
      if (!busy) setModal(null);
    }}>
      {modal === "slot" && picked && <div className="grid gap-4"><p>{dateLabel(picked.starts_at)} – {clock(picked.ends_at)}</p><button className={button} disabled={busy} onClick={() => openNew(picked)}>Reservar este horario</button><button className={button} disabled={busy} onClick={() => perform(() => post("/admin/blocks", { starts_at: picked.starts_at, ends_at: picked.occupied_until }))}>Bloquear este horario</button></div>}
      {error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}
      {["new", "move"].includes(modal) && <form onSubmit={modal === "new" ? create : e => {
        e.preventDefault();
        perform(() => post("/admin/bookings/" + selected.id + "/move", {
          starts_at: slot,
          revision: selected.revision
        }));
      }}>
        {modal === "new" && <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Tratamiento<select value={serviceId} onChange={e => setServiceId(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal">{services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Fecha<input type="date" min={dateKey()} value={day} onChange={e => setDay(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Hora disponible<select required value={slot} onChange={e => setSlot(e.target.value)} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal"><option value="">Selecciona una hora</option>{slots.map(s => <option value={s.starts_at} key={s.starts_at}>{clock(s.starts_at)} – {clock(s.ends_at)}</option>)}</select></label>
        {modal === "new" && <><CustomerPicker onSelect={c => { setProfile(c); setCustomer(Object.fromEntries(Object.keys(emptyCustomer).map(k => [k, c[k] || ""]))); }} onNew={() => { setProfile(null); setCustomer({...emptyCustomer}); }} /><CustomerFields value={customer} onChange={setCustomer} />{profile && <p className="text-sm">Los cambios de estos datos actualizarán también la ficha seleccionada.</p>}<label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Notas internas<textarea value={notes} onChange={e => setNotes(e.target.value)} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal min-h-[110px]" /></label><p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">Esta reserva se confirma sin cobrar abono. Queda pendiente el total del tratamiento y no se registra aceptación de cuidados por la clienta.</p></>}
        <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 w-full mt-5" disabled={busy || !slot}>{busy ? "Guardando…" : modal === "new" ? "Confirmar reserva interna" : "Confirmar nueva hora"}</button>
      </form>}
      {modal === "block" && <form onSubmit={e => {
        e.preventDefault();
        perform(() => post("/admin/blocks", {
          starts_at: chileISO(day + "T" + blockStart + ":00"),
          ends_at: chileISO(day + "T" + blockEnd + ":00"),
        }));
      }}>
        <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Fecha<input type="date" value={day} onChange={e => setDay(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1"><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Desde<input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Hasta<input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label></div><button disabled={busy} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Guardar bloqueo</button>
      </form>}
      {modal === "detail" && selected && <>
        <span className="inline-block text-[11px] rounded-full bg-[var(--color-highlight)] py-1 px-[9px]">{labels[selected.status]}</span><h3 className="text-[17px] font-[650] mt-3 mb-3">{selected.snapshot.name || "Bloqueo"}</h3><p className="mt-3 mb-3 leading-[1.6]">{dateLabel(selected.starts_at)} – {clock(selected.ends_at)}</p>
        {selected.service_id && <><p className="mt-3 mb-3 leading-[1.6]"><strong>{selected.customer.first_name} {selected.customer.last_name}</strong><br />{selected.customer.email}<br />{selected.customer.phone}</p><p className="mt-3 mb-3 leading-[1.6]">Total: {money(selected.snapshot.price)} · Cobrado TUU: {money(selected.payment_status === "completed" ? selected.payment_amount : 0)} · Saldo: {money(selected.snapshot.price - (selected.payment_status === "completed" ? selected.payment_amount : 0))}</p><p className="mt-3 mb-3 leading-[1.6]">Pago: {selected.payment_status || "Sin pago registrado"}<br />{selected.reference}</p><details><summary>Cuidados aceptados / versión guardada</summary><div className="whitespace-pre-wrap bg-[var(--color-background)] rounded-xl p-5 leading-[1.7] mt-[18px] mb-[18px]">{selected.snapshot.care}</div><p className="mt-3 mb-3 leading-[1.6]">{selected.accepted_at ? "Aceptados el " + dateLabel(selected.accepted_at) : "No se registró aceptación de la clienta."}</p></details></>}
        {selected.notes && <p className="mt-3 mb-3 leading-[1.6]">Notas internas: {selected.notes}</p>}
        {selected.status === "confirmed" && <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
          setDay(dateKey(selected.starts_at));
          setServiceId(String(selected.service_id));
          setModal("move");
        }}>Reprogramar</button>}
        {["held", "confirmed", "blocked"].includes(selected.status) && <><p className="mt-3 mb-3 leading-[1.6] text-[var(--color-muted)] text-[13px]">Cancelar libera el horario. No realiza devoluciones automáticas.</p><button className="rounded-[10px] px-[17px] py-[11px] bg-red-700 text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={() => perform(() => post("/admin/bookings/" + selected.id + "/cancel", {
            revision: selected.revision
          }))}>{selected.status === "blocked" ? "Liberar bloqueo" : "Cancelar reserva"}</button></>}
      </>}
    </Modal>}
  </section>;
}
