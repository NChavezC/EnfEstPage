import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, post, money, dateKey, clock } from "../features/agenda/api";
import Modal from "../features/agenda/Modal";
export default function Booking() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null),
    [serviceId, setServiceId] = useState(""),
    [categoryId, setCategoryId] = useState(""),
    [day, setDay] = useState(dateKey());
  const [slots, setSlots] = useState([]),
    [slot, setSlot] = useState(""),
    [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: ""
  });
  const [modal, setModal] = useState(false),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const service = catalog?.services.find(s => s.id === Number(serviceId));
  useEffect(() => {
    api("/catalog").then(data => { setCatalog(data); setCategoryId(String(data.categories?.[0]?.id || "")); }).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    setSlot("");
    setSlots([]);
    setAccepted(false);
    if (!serviceId) return;
    let active = true;
    setLoading(true);
    setError("");
    api("/availability?day=" + day + "&service_id=" + serviceId).then(data => {
      if (active) setSlots(data);
    }).catch(e => {
      if (active) setError(e.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [serviceId, day]);
  async function reserve() {
    if (!accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const b = await post("/bookings", {
        service_id: service.id,
        service_version: service.version,
        starts_at: slot,
        customer,
        accepted_care: true
      });
      sessionStorage.setItem("agenda_last_token", b.token);
      // Persist access before starting checkout, so an uncertain provider result is recoverable.
      navigate("/reservar/resultado?token=" + encodeURIComponent(b.token), {
        replace: true
      });
    } catch (e) {
      setError(e.message);
      setModal(false);
      setBusy(false);
    }
  }
  return <section className="max-w-[1240px] mx-auto pt-12 px-6 pb-20 text-[var(--color-body)] max-[760px]:px-4 max-[760px]:pt-7 max-[760px]:pb-[60px]">
    <div className="text-[11px] font-bold tracking-[0.16em] text-[var(--color-primary-dark)]">ENFERMERA ESTÉTICA · RESERVAS</div>
    <h1 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.035em] mt-2.5 mb-3">Un momento para cuidarte</h1><p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)]">Elige tu tratamiento y encuentra un horario disponible.</p>
    {catalog?.payment_mode === "mock" && <div className="px-[18px] py-3.5 rounded-xl mt-[18px] mb-[18px] leading-[1.6] bg-amber-50 text-amber-900 border border-amber-200">Entorno de prueba: los pagos son simulados. No se realiza ningún cobro.</div>}
    {error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}
    {!catalog && !error && <p className="mt-2.5 mb-2.5 leading-[1.65]">Cargando tratamientos…</p>}
    <div className="grid grid-cols-[1.7fr_1fr] gap-[26px] mt-[30px] max-[760px]:grid-cols-1" data-testid="booking-layout"><form className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5" onSubmit={e => {
        e.preventDefault();
        setAccepted(false);
        setModal(true);
      }}>
      <h2 className="text-[21px] font-[650] mt-3.5 mb-3.5"><span className="inline-grid place-items-center w-[27px] h-[27px] rounded-full bg-[var(--color-highlight)] text-[var(--color-primary-dark)] text-[13px] mr-2">1</span> Elige tu tratamiento</h2>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-5">Categoría<select aria-label="Categoría" value={categoryId} onChange={e => { setCategoryId(e.target.value); setServiceId(""); setSlot(""); setSlots([]); }} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal">{catalog?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="grid gap-2.5 mb-[30px]">{catalog?.services.filter(s => String(s.category_id) === categoryId).map(s => <button type="button" className={serviceId === String(s.id) ? "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-highlight)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50 text-left flex flex-col gap-[7px]" : "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-body)] font-semibold border border-[var(--color-highlight)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50 text-left flex flex-col gap-[7px]"} key={s.id} onClick={() => setServiceId(String(s.id))} aria-pressed={serviceId === String(s.id)}>
        <strong>{s.name}</strong><span className="text-[13px] font-normal">{s.duration} min · {money(s.price)}</span>
      </button>)}</div>
      <h2 className="text-[21px] font-[650] mt-3.5 mb-3.5"><span className="inline-grid place-items-center w-[27px] h-[27px] rounded-full bg-[var(--color-highlight)] text-[var(--color-primary-dark)] text-[13px] mr-2">2</span> Encuentra tu horario</h2>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Fecha<input type="date" min={dateKey()} value={day} onChange={e => setDay(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>
      <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Horarios de Chile.</p>
      <div className="flex gap-2.5 flex-wrap mt-4 mb-4" aria-live="polite">{loading ? <p className="mt-2.5 mb-2.5 leading-[1.65]">Consultando disponibilidad…</p> : slots.map(s => <button type="button" key={s.starts_at} aria-pressed={slot === s.starts_at} className={slot === s.starts_at ? "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-highlight)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50" : "rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => setSlot(s.starts_at)}>{clock(s.starts_at)} – {clock(s.ends_at)}</button>)}</div>
      {service && !loading && !slots.length && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-[var(--color-background)] text-[var(--color-muted)]">No hay horas disponibles para este día. Prueba otra fecha.</p>}
      <h2 className="text-[21px] font-[650] mt-3.5 mb-3.5"><span className="inline-grid place-items-center w-[27px] h-[27px] rounded-full bg-[var(--color-highlight)] text-[var(--color-primary-dark)] text-[13px] mr-2">3</span> Tus datos</h2>
      <div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1">{[["first_name", "Nombre", "text", "given-name"], ["last_name", "Apellidos", "text", "family-name"], ["email", "Correo electrónico", "email", "email"], ["phone", "Teléfono", "tel", "tel"]].map(([key, label, type, auto]) => <label key={key} className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">{label}<input value={customer[key]} type={type} autoComplete={auto} required minLength={key.includes("name") ? 2 : undefined} maxLength={150} placeholder={key === "phone" ? "+56912345678" : ""} onChange={e => setCustomer({
              ...customer,
              [key]: e.target.value
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>)}</div>
      <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 w-full mt-5" disabled={!service || !slot || busy}>Revisar cuidados y continuar</button>
    </form><aside className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5 sticky top-6 self-start max-[760px]:static" data-testid="booking-summary"><div className="text-[11px] font-bold tracking-[0.16em] text-[var(--color-primary-dark)]">TU RESERVA</div><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">{service?.name || "Selecciona un tratamiento"}</h2>
      {service && <><dl className="mt-6 mb-6"><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)]"><dt>Duración</dt><dd className="font-[650]">{service.duration} minutos</dd></div><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)]"><dt>Valor total</dt><dd className="font-[650]">{money(service.price)}</dd></div><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)] text-[var(--color-primary-dark)] text-lg"><dt>Abono al reservar</dt><dd className="font-[650]">{money(service.deposit)}</dd></div><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)]"><dt>Saldo en atención</dt><dd className="font-[650]">{money(service.price - service.deposit)}</dd></div></dl><p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">La reserva se confirma al verificar tu pago. Para cambios de horario, contacta al centro.</p></>}
    </aside></div>
    {modal && service && <Modal title="Cuidados previos a tu tratamiento" onClose={() => {
      if (!busy) setModal(false);
    }}>
      <p className="mt-3 mb-3 leading-[1.6]"><strong>{service.name}</strong></p><div className="whitespace-pre-wrap bg-[var(--color-background)] rounded-xl p-5 leading-[1.7] mt-[18px] mb-[18px]">{service.care}</div>
      <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />He leído y acepto los cuidados previos de este tratamiento.</label>
      <p className="mt-3 mb-3 leading-[1.6]">Al continuar retendremos tu horario temporalmente. Abono: <strong>{money(service.deposit)}</strong>.</p>
      <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 w-full mt-5" disabled={!accepted || busy} onClick={reserve}>{busy ? "Reservando horario…" : "Continuar al pago"}</button>
    </Modal>}
  </section>;
}
