import { useEffect, useRef, useState } from "react";
import { api, clock, dateKey, dateLabel, labels } from "./api";
import { minute, instantMinute, dayPlan, segment, layoutEntries } from "./calendarGeometry";
import "./calendar.css";

const SCALE = 1.25;
const HOLD_MS = 450;
export default function CalendarTimeGrid({ dates, bookings, availability, rules, loading, busy, onNavigate, onSlot, onDetail, onMove, onError, onDraggingChange }) {
  const viewport = useRef(null), session = useRef(null), swipe = useRef(null), suppressUntil = useRef(0);
  const handlers = useRef({}), frame = useRef(null), mounted = useRef(false), positioned = useRef(false);
  const [drag, setDrag] = useState(null), [announcement, setAnnouncement] = useState("");
  const [now, setNow] = useState(new Date());
  const plans = dates.map(d => dayPlan(rules, d));
  const visible = bookings.filter(b => ["held", "confirmed", "blocked", "payment_review"].includes(b.status));
  const overnight = visible.some(b => dateKey(b.starts_at) !== dateKey(b.ends_at));
  const from = Math.floor(Math.min(overnight ? 0 : 420, ...plans.filter(p => !p.closed).map(p => minute(p.shift_start)),
    ...visible.filter(b => dates.includes(dateKey(b.starts_at))).map(b => instantMinute(b.starts_at))) / 60) * 60;
  const to = Math.ceil(Math.max(overnight ? 1440 : 1260, ...plans.filter(p => !p.closed).map(p => minute(p.shift_end)),
    ...visible.filter(b => dates.includes(dateKey(b.ends_at))).map(b => instantMinute(b.ends_at))) / 60) * 60;
  useEffect(() => { if (!busy) setAnnouncement(text => text === "Guardando nueva hora…" ? "" : text); }, [busy]);
  useEffect(() => {
    if (loading || positioned.current || !viewport.current) return;
    const starts = [...plans.filter(p => !p.closed).map(p => minute(p.shift_start)), ...visible.filter(b => dates.includes(dateKey(b.starts_at))).map(b => instantMinute(b.starts_at))];
    viewport.current.scrollTop = Math.max(0, ((starts.length ? Math.min(...starts) : 540) - from) * SCALE - 12);
    positioned.current = true;
  }, [loading, plans, visible, dates, from]);
  const height = (to - from) * SCALE;
  const pos = (a, b) => ({ top: (a - from) * SCALE, height: Math.max(1, (b - a) * SCALE) });
  function stop(render = true) {
    const current = session.current;
    if (current) clearTimeout(current.timer);
    session.current = null; swipe.current = null;
    cancelAnimationFrame(frame.current);
    onDraggingChange(false);
    if (render && mounted.current) setDrag(null);
  }
  function locate(x, y) {
    const box = viewport.current?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top + 48 || y > box.bottom) return null;
    const column = [...viewport.current.querySelectorAll("[data-calendar-day]")].find(el => {
      const r = el.getBoundingClientRect(); return x >= r.left && x < r.right;
    });
    if (!column) return null;
    const r = column.getBoundingClientRect(), point = from + (y - r.top) / SCALE;
    return session.current?.targets.find(t => dateKey(t.starts_at) === column.dataset.calendarDay &&
      point >= instantMinute(t.starts_at) && point < instantMinute(t.ends_at)) || null;
  }
  function updateTarget(x, y) {
    const current = session.current;
    if (!current?.active) return;
    current.x = x; current.y = y;
    const target = locate(x, y);
    const changed = current.target?.starts_at !== target?.starts_at;
    current.target = target;
    setDrag({ ...current });
    if (changed) {
      setAnnouncement(target ? "Soltar para reprogramar: " + dateLabel(target.starts_at) : "Suelta en uno de los horarios resaltados.");
    }
  }
  function autoScroll() {
    const current = session.current, el = viewport.current;
    if (!current?.active || !el) return;
    const r = el.getBoundingClientRect();
    if (current.x >= r.left && current.x <= r.right && current.y >= r.top && current.y <= r.bottom) {
      const delta = current.y < r.top + 90 ? -7 : current.y > r.bottom - 48 ? 7 : 0;
      if (delta) { el.scrollTop += delta; updateTarget(current.x, current.y); }
    }
    frame.current = requestAnimationFrame(autoScroll);
  }
  function startPress(target, x, y, kind) {
    if (busy || loading || session.current) return;
    const id = target.closest?.("[data-booking-id]")?.dataset.bookingId;
    const booking = visible.find(b => b.id === id && b.status === "confirmed");
    if (!booking) return;
    const current = { booking, kind, originX: x, originY: y, x, y, active: false, targets: [], target: null, loading: true };
    current.timer = setTimeout(async () => {
      if (session.current !== current) return;
      current.active = true; swipe.current = null; suppressUntil.current = Date.now() + 1000;
      onDraggingChange(true); setDrag({ ...current }); setAnnouncement("Buscando horarios para reprogramar…");
      frame.current = requestAnimationFrame(autoScroll);
      try {
        const rows = await Promise.all(dates.map(day => api("/admin/availability?day=" + day + "&service_id=" + booking.service_id + "&exclude=" + booking.id)));
        if (session.current !== current || !mounted.current) return;
        current.targets = rows.flat().filter(t => new Date(t.starts_at).getTime() !== new Date(booking.starts_at).getTime());
        current.loading = false; setDrag({ ...current });
        setAnnouncement(current.targets.length ? "Arrastra a un horario resaltado. Suelta para guardar; Escape cancela." : "No hay otro horario disponible en este período.");
        updateTarget(current.x, current.y);
      } catch (e) {
        if (session.current === current && mounted.current) { stop(); onError(e.message); }
      }
    }, HOLD_MS);
    session.current = current;
  }
  function movePress(x, y, event) {
    const current = session.current;
    if (!current) return;
    if (!current.active) {
      if (Math.hypot(x - current.originX, y - current.originY) > 9) { clearTimeout(current.timer); session.current = null; }
      return;
    }
    if (event.cancelable) event.preventDefault();
    updateTarget(x, y);
  }
  function finishPress() {
    const current = session.current;
    if (!current) return false;
    const active = current.active, target = current.target;
    stop();
    if (active) {
      suppressUntil.current = Date.now() + 700;
      if (target && !current.loading) { setAnnouncement("Guardando nueva hora…"); onMove(current.booking, target); }
      else setAnnouncement("Movimiento cancelado. La reserva conserva su horario.");
    }
    return active;
  }
  handlers.current = {
    touchStart(e) {
      suppressUntil.current = 0;
      if (e.touches.length !== 1) { stop(); return; }
      const t = e.touches[0];
      swipe.current = { x: t.clientX, y: t.clientY };
      startPress(e.target, t.clientX, t.clientY, "touch");
    },
    touchMove(e) {
      if (e.touches.length !== 1) { stop(); return; }
      const t = e.touches[0]; movePress(t.clientX, t.clientY, e);
    },
    touchEnd(e) {
      const gesture = swipe.current;
      if (finishPress()) return;
      swipe.current = null;
      if (!gesture || busy || !e.changedTouches.length) return;
      const t = e.changedTouches[0], dx = t.clientX - gesture.x, dy = t.clientY - gesture.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressUntil.current = Date.now() + 700; onNavigate(dx < 0 ? 1 : -1);
      }
    },
    pointerMove(e) { if (session.current?.kind === "mouse") movePress(e.clientX, e.clientY, e); },
    pointerUp() { if (session.current?.kind === "mouse") finishPress(); },
    cancel() { if (session.current?.active) suppressUntil.current = Date.now() + 700; stop(); },
    key(e) { if (e.key === "Escape" && session.current) { e.preventDefault(); suppressUntil.current = Date.now() + 700; stop(); setAnnouncement("Movimiento cancelado."); } },
  };
  useEffect(() => {
    mounted.current = true;
    const el = viewport.current;
    const start = e => handlers.current.touchStart(e), move = e => handlers.current.touchMove(e);
    const end = e => handlers.current.touchEnd(e), cancel = () => handlers.current.cancel();
    const pointerMove = e => handlers.current.pointerMove(e), pointerUp = () => handlers.current.pointerUp();
    const key = e => handlers.current.key(e);
    const pointerCancel = e => { if (e.pointerType !== "touch") cancel(); };
    el.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", cancel);
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerup", pointerUp);
    document.addEventListener("pointercancel", pointerCancel);
    document.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => {
      mounted.current = false; handlers.current.cancel(); clearInterval(timer);
      el.removeEventListener("touchstart", start); document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end); document.removeEventListener("touchcancel", cancel);
      document.removeEventListener("pointermove", pointerMove); document.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("pointercancel", pointerCancel); document.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
    };
  }, []);
  return <div className="time-calendar">
    <div className="calendar-legend"><span>🟩 Disponible</span><span>🟪 Reserva</span><span>▧ Pausa / bloqueo</span><span>Gris: fuera de horario</span></div>
    <details className="calendar-help"><summary>Cómo mover una reserva</summary><p id="calendar-drag-help" className="text-sm my-2">Toca un horario para reservar o bloquear. Mantén pulsada una reserva confirmada y arrástrala para cambiarla de hora. También puedes usar «Reprogramar» en su detalle.</p></details>
    <p className="calendar-drag-status" role="status" aria-live="polite">{busy ? "Guardando cambios…" : announcement || (loading ? "Cargando agenda…" : "Agenda lista.")}</p>
    <div ref={viewport} data-testid="week-calendar" className="calendar-viewport" aria-label="Calendario por horas"
      aria-busy={busy || loading} onContextMenu={e => { if (e.target.closest("[data-booking-id]")) e.preventDefault(); }}
      onPointerDown={e => { if (e.pointerType !== "touch" && e.button === 0) { suppressUntil.current = 0; startPress(e.target, e.clientX, e.clientY, "mouse"); } }}
      onClickCapture={e => { if (Date.now() < suppressUntil.current || session.current?.active) { e.preventDefault(); e.stopPropagation(); } }}>
      <div className="calendar-time-grid" style={{ gridTemplateColumns: "44px repeat(" + dates.length + ", minmax(0, 1fr))" }}>
        <div className="calendar-day-heading calendar-time-heading">Hora</div>
        {dates.map(d => <h3 className={"calendar-day-heading " + (d === dateKey(now) ? "calendar-today" : "")} key={d}>
          <span>{new Date(d + "T12:00:00Z").toLocaleDateString("es-CL", { weekday: "short", timeZone: "America/Santiago" })}</span>
          <strong>{Number(d.slice(-2))}</strong>
        </h3>)}
        <div className="calendar-hours" style={{ height }}>{Array.from({ length: (to - from) / 60 + 1 }, (_, i) =>
          <span key={i} style={{ top: i * 60 * SCALE }}>{String(from / 60 + i).padStart(2, "0")}:00</span>)}</div>
        {dates.map((day, index) => {
          const plan = plans[index], slots = availability.find(w => w.day === day)?.slots || [];
          const entries = [
            ...slots.map(s => ({ ...s, available: true, key: s.starts_at })),
            ...visible.map(b => ({ ...b, key: b.id }))
          ].map(item => ({ ...item, ...segment(item.starts_at, item.ends_at, day, from, to) })).filter(e => e.end > e.start);
          const buffers = [...slots, ...visible.filter(b => ["confirmed", "held"].includes(b.status))].map(b => segment(b.ends_at, b.occupied_until, day, from, to)).filter(b => b.end > b.start);
          const targetSlots = (drag?.targets || []).filter(t => dateKey(t.starts_at) === day);
          return <div key={day} data-calendar-day={day} className="calendar-day-column" style={{ height }}>
            {!plan.closed && <div className="calendar-shift" style={pos(minute(plan.shift_start), minute(plan.shift_end))} />}
            {Array.from({ length: (to - from) / 30 }, (_, i) => <div className={"calendar-rule " + (i % 2 ? "calendar-half-hour" : "")} key={i} style={{ top: i * 30 * SCALE }} />)}
            {!plan.closed && (plan.breaks || []).map((b, i) => <div className="calendar-break" key={"break" + i} style={pos(minute(b.start), minute(b.end))}><span>Pausa</span></div>)}
            {buffers.map((b, i) => <div className="calendar-buffer" key={"buffer" + i} style={pos(b.start, b.end)} title="Descanso entre citas" />)}
            {plan.closed && <span className="calendar-closed">Cerrado</span>}
            {layoutEntries(entries).map(item => <button key={item.key} type="button" data-booking-id={item.id} data-slot-start={item.available ? item.starts_at : undefined}
              disabled={busy || loading} aria-describedby={item.status === "confirmed" ? "calendar-drag-help" : undefined}
              aria-label={clock(item.starts_at) + " – " + clock(item.ends_at) + " · " + (item.available ? "Disponible" : item.status === "blocked" ? "Bloqueo" : item.customer.first_name + " " + item.customer.last_name + " · " + labels[item.status])}
              className={"calendar-event " + (item.available ? "calendar-available" : "calendar-" + item.status) + (drag && drag.booking.id === item.id ? " calendar-drag-source" : "")}
              style={{ ...pos(item.start, item.end), left: "calc(" + (item.lane * 100 / item.lanes) + "% + 2px)", width: "calc(" + (100 / item.lanes) + "% - 4px)" }}
              onClick={() => item.available ? onSlot(item) : onDetail(item)}>
              <strong className="calendar-event-time">{clock(item.starts_at)}<span> – {clock(item.ends_at)}</span></strong>
              <span>{item.available ? "Disponible" : item.status === "blocked" ? "Bloqueo" : item.customer.first_name + " " + item.customer.last_name}</span>
              {!item.available && item.status !== "blocked" && <small>{item.snapshot.name}</small>}
              {!item.available && <small>{labels[item.status]}</small>}
            </button>)}
            {targetSlots.map(t => <div key={t.starts_at} data-drop-start={t.starts_at} className={"calendar-drop-target " + (drag.target?.starts_at === t.starts_at ? "calendar-drop-selected" : "")}
              style={pos(instantMinute(t.starts_at), instantMinute(t.ends_at))}><span>{drag.target?.starts_at === t.starts_at ? "Soltar aquí" : "Mover aquí"}<br />{clock(t.starts_at)} – {clock(t.ends_at)}</span></div>)}
            {day === dateKey(now) && instantMinute(now) >= from && instantMinute(now) <= to &&
              <div className="calendar-now" aria-label="Hora actual" style={{ top: (instantMinute(now) - from) * SCALE }} />}
          </div>;
        })}
      </div>
    </div>
    {drag && <div aria-hidden="true" className="calendar-floating-preview" style={{ left: Math.min(drag.x + 12, window.innerWidth - 160), top: Math.max(8, drag.y - 48) }}>{drag.booking.customer.first_name}<br />{drag.target ? clock(drag.target.starts_at) : "Reprogramar"}</div>}
    {drag && <div className="calendar-drag-toolbar"><strong>{drag.booking.customer.first_name} · {drag.loading ? "Buscando horarios…" : drag.target ? dateLabel(drag.target.starts_at) : "Arrastra a un horario resaltado"}</strong><button type="button" onClick={() => { stop(); setAnnouncement("Movimiento cancelado."); }}>Cancelar movimiento</button></div>}
  </div>;
}
