import { useEffect, useState } from "react";
import { api, post, dateKey, clock, dateLabel, addDays, chileISO, labels, money } from "./api";
import Modal from "./Modal";
const initialCustomer = {
  first_name: "",
  last_name: "",
  email: "",
  phone: ""
};
function startMinute(value) {
  const [h, m] = clock(value).split(":").map(Number);
  return h * 60 + m;
}
function minute(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function dayPlan(rules, day) {
  const special = rules.find(r => r.specific_date === day);
  if (special) return special.plan;
  const weekday = (new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7;
  return rules.filter(r => r.weekday === weekday && r.effective_from <= day).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]?.plan || {
    closed: true
  };
}
export default function CalendarPanel() {
  const [anchor, setAnchor] = useState(dateKey()),
    [view, setView] = useState(window.innerWidth < 760 ? "day" : "week");
  const [bookings, setBookings] = useState([]),
    [services, setServices] = useState([]),
    [rules, setRules] = useState([]);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [updated, setUpdated] = useState(null);
  const [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  const [day, setDay] = useState(dateKey()),
    [serviceId, setServiceId] = useState(""),
    [slots, setSlots] = useState([]),
    [slot, setSlot] = useState("");
  const [customer, setCustomer] = useState(initialCustomer),
    [notes, setNotes] = useState(""),
    [reason, setReason] = useState("");
  const [blockStart, setBlockStart] = useState("09:00"),
    [blockEnd, setBlockEnd] = useState("11:00");
  const weekOffset = (new Date(anchor + "T12:00:00Z").getUTCDay() + 6) % 7;
  const start = view === "day" ? anchor : addDays(anchor, -weekOffset);
  const dates = Array.from({
    length: view === "day" ? 1 : 7
  }, (_, i) => addDays(start, i));
  const end = dates[dates.length - 1];
  const service = services.find(s => s.id === Number(serviceId));
  async function reload() {
    const rows = await api("/admin/bookings?start=" + start + "&end=" + end);
    setBookings(rows);
    setUpdated(new Date());
    setError("");
  }
  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([api("/admin/bookings?start=" + start + "&end=" + end), api("/admin/schedule")]).then(([rows, schedule]) => {
      if (active) {
        setBookings(rows);
        setRules(schedule);
        setUpdated(new Date());
        setError("");
      }
    }).catch(e => {
      if (active) setError("No se pudo actualizar la agenda: " + e.message);
    });
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [start, end]);
  useEffect(() => {
    api("/admin/services").then(setServices).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!["new", "move"].includes(modal) || !serviceId) return;
    let active = true;
    setSlots([]);
    setSlot("");
    api("/admin/availability?day=" + day + "&service_id=" + serviceId + (modal === "move" ? "&exclude=" + selected.id : "")).then(data => {
      if (active) setSlots(data);
    }).catch(e => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [modal, day, serviceId, selected]);
  function openNew() {
    setSelected(null);
    setDay(anchor);
    setServiceId(String(services.find(s => s.active)?.id || ""));
    setCustomer(initialCustomer);
    setNotes("");
    setError("");
    setModal("new");
  }
  async function perform(action) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await reload();
      setModal(null);
      setMessage("Agenda actualizada.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function create(e) {
    e.preventDefault();
    perform(() => post("/admin/bookings", {
      service_id: service.id,
      service_version: service.version,
      starts_at: slot,
      customer,
      accepted_care: false,
      notes
    }));
  }
  const active = bookings.filter(b => ["confirmed", "held", "blocked"].includes(b.status));
  const plans = dates.map(d => dayPlan(rules, d)).filter(p => !p.closed);
  const rangeStart = Math.floor(Math.min(420, ...plans.map(p => minute(p.shift_start)), ...active.map(b => startMinute(b.starts_at))) / 60) * 60;
  const rangeEnd = Math.ceil(Math.max(1260, ...plans.map(p => minute(p.shift_end)), ...active.map(b => startMinute(b.ends_at))) / 60) * 60;
  const height = rangeEnd - rangeStart;
  return <section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5">
    <div className="flex gap-3 items-center justify-between flex-wrap"><div className="flex gap-2.5 flex-wrap mt-4 mb-4"><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setAnchor(addDays(anchor, view === "day" ? -1 : -7))} aria-label="Anterior">←</button><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setAnchor(dateKey())}>Hoy</button><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setAnchor(addDays(anchor, view === "day" ? 1 : 7))} aria-label="Siguiente">→</button></div>
      <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} aria-label="Fecha de agenda" className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-auto text-[var(--color-body)] font-normal" />
      <div className="flex gap-2.5 flex-wrap mt-4 mb-4"><button className={view === "day" ? "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-highlight)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50" : "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => setView("day")}>Día</button><button className={view === "week" ? "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-highlight)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50" : "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => setView("week")}>Semana</button><button onClick={openNew} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Nueva reserva</button><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
          setDay(anchor);
          setReason("");
          setModal("block");
        }}>Bloquear horario</button></div>
    </div>
    <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">America/Santiago · {updated ? "Actualizada a las " + clock(updated) : "Cargando…"} · Confirmadas {bookings.filter(b => b.status === "confirmed").length}</p>
    {error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}{message && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-green-50 text-green-800" role="status">{message}</p>}
    <div className="overflow-auto max-h-[800px] border border-[var(--color-highlight)] rounded-[14px] mt-5"><div className={view === "day" ? "grid grid-cols-[55px_repeat(var(--days),minmax(135px,1fr))] min-w-[280px] bg-[var(--color-surface)] max-[760px]:min-w-[260px]" : "grid grid-cols-[55px_repeat(var(--days),minmax(135px,1fr))] min-w-[800px] bg-[var(--color-surface)] max-[760px]:min-w-[960px]"} style={{
        "--days": dates.length,
        "--calendar-height": height + "px"
      }}>
      <div className="text-center text-xs py-3 px-[5px] bg-[var(--color-background)] sticky top-0 z-[3] border-b border-[var(--color-highlight)]">Hora</div>{dates.map(d => <div className="text-center text-xs py-3 px-[5px] bg-[var(--color-background)] sticky top-0 z-[3] border-b border-[var(--color-highlight)]" key={d}>{new Date(d + "T12:00:00Z").toLocaleDateString("es-CL", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "America/Santiago"
          })}</div>)}
      <div className="relative h-[var(--calendar-height,840px)] text-[11px] text-[var(--color-muted)]">{Array.from({
            length: height / 60
          }, (_, i) => <span key={i} style={{
            top: i * 60
          }} className="absolute right-2 -translate-y-[7px]">{String(i + rangeStart / 60).padStart(2, "0")}:00</span>)}</div>
      {dates.map(d => {
          const p = dayPlan(rules, d);
          return <div className="relative h-[var(--calendar-height,840px)] border-l border-[var(--color-highlight)] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_59px,var(--color-highlight)_59px,var(--color-highlight)_60px)]" key={d}>
        {p.closed ? <div className="absolute left-0 right-0 bg-slate-100/80 pointer-events-none" style={{
              top: 0,
              height: "100%"
            }}>Cerrado</div> : <>
          <div className="absolute left-0 right-0 bg-slate-100/80 pointer-events-none" style={{
                top: 0,
                height: Math.max(0, minute(p.shift_start) - rangeStart)
              }} />
          <div className="absolute left-0 right-0 bg-slate-100/80 pointer-events-none" style={{
                top: Math.max(0, minute(p.shift_end) - rangeStart),
                bottom: 0
              }} />
          {p.breaks?.map((b, i) => <div key={i} className="absolute left-0 right-0 bg-[repeating-linear-gradient(135deg,#efebeec9,#efebeec9_5px,#e4dde3b0_5px,#e4dde3b0_10px)] text-[10px] text-[var(--color-muted)] pl-1 pointer-events-none" style={{
                top: minute(b.start) - rangeStart,
                height: minute(b.end) - minute(b.start)
              }}>Pausa</div>)}
        </>}
        {active.filter(b => dateKey(b.starts_at) <= d && dateKey(b.occupied_until) >= d).map(b => {
              const top = dateKey(b.starts_at) < d ? 0 : Math.max(0, startMinute(b.starts_at) - rangeStart);
              const bottom = dateKey(b.ends_at) > d ? height : Math.min(height, startMinute(b.ends_at) - rangeStart);
              return <button key={b.id} className={b.status === "held" ? "rounded-lg bg-amber-50 text-amber-900 font-semibold border border-amber-400 cursor-pointer transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 absolute left-1 right-1 p-2 text-left overflow-hidden text-[11px] leading-[1.35] z-[1] border-dashed" : b.status === "blocked" ? "rounded-lg bg-[repeating-linear-gradient(135deg,#f2f1f3,#f2f1f3_7px,#e5e2e7_7px,#e5e2e7_14px)] text-slate-600 font-semibold border border-slate-300 cursor-pointer transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 absolute left-1 right-1 p-2 text-left overflow-hidden text-[11px] leading-[1.35] z-[1]" : b.status === "payment_review" ? "rounded-lg bg-red-50 text-red-800 font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 absolute left-1 right-1 p-2 text-left overflow-hidden text-[11px] leading-[1.35] z-[1]" : "rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-body)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 absolute left-1 right-1 p-2 text-left overflow-hidden text-[11px] leading-[1.35] z-[1]"} style={{
                top,
                height: Math.max(28, bottom - top)
              }} onClick={() => {
                setSelected(b);
                setReason("");
                setError("");
                setModal("detail");
              }}>
            <strong className="block mt-[3px] mb-[3px]">{clock(b.starts_at)} – {clock(b.ends_at)}</strong><strong className="block mt-[3px] mb-[3px]">{b.status === "blocked" ? b.notes : b.customer.first_name + " " + b.customer.last_name}</strong><span className="block mt-[3px] mb-[3px]">{b.snapshot.name}</span><span className="block mt-[3px] mb-[3px]">{labels[b.status]}</span>
          </button>;
            })}
        {d === dateKey() && <div className="absolute left-0 right-0 border-t-2 border-[var(--color-primary-dark)] z-[2] pointer-events-none" style={{
              top: startMinute(new Date()) - rangeStart
            }} />}
      </div>;
        })}
    </div></div>
    <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Selecciona una cita para ver sus datos, reprogramarla o cancelarla. Las retenciones se muestran con borde discontinuo.</p>
    <details><summary>Historial del período ({bookings.length})</summary><div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Cita</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Cliente</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Estado</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top"></th></tr></thead><tbody>{bookings.map(b => <tr key={b.id}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{dateLabel(b.starts_at)}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{b.customer.first_name || "Bloqueo"}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{labels[b.status]}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top"><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
                  setSelected(b);
                  setReason("");
                  setModal("detail");
                }}>Ver</button></td></tr>)}</tbody></table></div></details>
    {modal && <Modal title={{
      new: "Nueva reserva interna",
      detail: "Detalle de la reserva",
      move: "Reprogramar cita",
      block: "Bloquear horario"
    }[modal]} onClose={() => {
      if (!busy) setModal(null);
    }}>
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
        {modal === "new" && <><div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1">{[["first_name", "Nombre", "text"], ["last_name", "Apellidos", "text"], ["email", "Correo", "email"], ["phone", "Teléfono", "tel"]].map(([k, l, t]) => <label key={k} className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">{l}<input type={t} required value={customer[k]} onChange={e => setCustomer({
                ...customer,
                [k]: e.target.value
              })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>)}</div><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Notas internas<textarea value={notes} onChange={e => setNotes(e.target.value)} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal min-h-[110px]" /></label><p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">Esta reserva se confirma sin cobrar abono. Queda pendiente el total del tratamiento y no se registra aceptación de cuidados por la clienta.</p></>}
        <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 w-full mt-5" disabled={busy || !slot}>{busy ? "Guardando…" : modal === "new" ? "Confirmar reserva interna" : "Confirmar nueva hora"}</button>
      </form>}
      {modal === "block" && <form onSubmit={e => {
        e.preventDefault();
        perform(() => post("/admin/blocks", {
          starts_at: chileISO(day + "T" + blockStart + ":00"),
          ends_at: chileISO(day + "T" + blockEnd + ":00"),
          reason
        }));
      }}>
        <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Fecha<input type="date" value={day} onChange={e => setDay(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1"><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Desde<input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Hasta<input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label></div><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Motivo<input required minLength={3} value={reason} onChange={e => setReason(e.target.value)} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><button disabled={busy} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Guardar bloqueo</button>
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
        {["held", "confirmed", "blocked"].includes(selected.status) && <><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Motivo de cancelación<input value={reason} minLength={3} onChange={e => setReason(e.target.value)} placeholder="Indica el motivo" className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><p className="mt-3 mb-3 leading-[1.6] text-[var(--color-muted)] text-[13px]">Cancelar libera el horario. No realiza devoluciones automáticas.</p><button className="rounded-[10px] px-[17px] py-[11px] bg-red-700 text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || reason.trim().length < 3} onClick={() => perform(() => post("/admin/bookings/" + selected.id + "/cancel", {
            reason,
            revision: selected.revision
          }))}>Cancelar {selected.status === "blocked" ? "bloqueo" : "reserva"}</button></>}
      </>}
    </Modal>}
  </section>;
}
