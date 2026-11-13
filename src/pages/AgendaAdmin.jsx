import { useEffect, useState } from "react";
import { api, post } from "../features/agenda/api";
import ScheduleEditor from "../features/agenda/ScheduleEditor";
import ServiceEditor from "../features/agenda/ServiceEditor";
import CalendarPanel from "../features/agenda/CalendarPanel";
import CustomersPanel from "../features/agenda/CustomersPanel";
function SettingsPanel() {
  const [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    api("/admin/settings").then(({
      id,
      ...data
    }) => {
      void id;
      setForm(data);
    }).catch(e => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      setMessage("Configuración guardada");
    } catch (e) {
      setError(e.message);
    }
  }
  return <section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5">{form && <form onSubmit={save}><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Configuración de la agenda</h2><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Profesional<input required value={form.professional} onChange={e => setForm({
          ...form,
          professional: e.target.value
        })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1">{[["notice_hours", "Anticipación mínima (horas)"], ["horizon_days", "Reservar hasta (días)"], ["hold_minutes", "Retención de cupo (minutos)"]].map(([k, l]) => <label key={k} className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">{l}<input type="number" min="0" required value={form[k]} onChange={e => setForm({
            ...form,
            [k]: Number(e.target.value)
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>)}</div><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Guardar configuración</button></form>}{error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800">{error}</p>}{message && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-green-50 text-green-800">{message}</p>}</section>;
}
function Operations() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const load = () => api("/admin/operations").then(setData).catch(e => setError(e.message));
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);
  return <section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5"><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Pagos y notificaciones</h2>{error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800">{error}</p>}{data && <>
    {data.mail_mode === "file" && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">Correo en modo local: se generan archivos .eml de prueba; no se envían mensajes a clientas.</p>}
    <h3 className="text-[17px] font-[650] mt-3 mb-3">Incidencias de pago</h3>{!data.incidents.length ? <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-[var(--color-background)] text-[var(--color-muted)]">No hay incidencias pendientes.</p> : <div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Referencia</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Pago</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Reserva</th></tr></thead><tbody>{data.incidents.map(i => <tr key={i.reference}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{i.reference}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{i.payment_status}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{i.status}</td></tr>)}</tbody></table></div>}
    <h3 className="text-[17px] font-[650] mt-3 mb-3">Últimas notificaciones</h3><div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Correo</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Tipo</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Estado</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Observación</th></tr></thead><tbody>{data.jobs.map(j => <tr key={j.id}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{j.email}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{j.kind}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{j.status}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{j.last_error || "—"}</td></tr>)}</tbody></table></div>
    <h3 className="text-[17px] font-[650] mt-3 mb-3">Historial administrativo</h3><div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Fecha</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Acción</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Detalle</th></tr></thead><tbody>{data.audit.map(a => <tr key={a.id}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{new Date(a.created_at).toLocaleString("es-CL", {
                  timeZone: "America/Santiago"
                })}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{a.action}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{a.details || a.entity}</td></tr>)}</tbody></table></div>
  </>}</section>;
}
export default function AgendaAdmin() {
  const [authenticated, setAuthenticated] = useState(false),
    [checking, setChecking] = useState(true),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [tab, setTab] = useState("calendar");
  useEffect(() => {
    api("/admin/session").then(() => setAuthenticated(true)).catch(e => {
      if (e.status !== 401) setError(e.message);
    }).finally(() => setChecking(false));
  }, []);
  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      await post("/login", {
        password
      });
      setPassword("");
      setAuthenticated(true);
    } catch (e) {
      setError(e.message);
    }
  }
  async function logout() {
    try {
      await post("/admin/logout");
      setAuthenticated(false);
    } catch (e) {
      setError(e.message);
    }
  }
  return <section className="agenda-admin max-w-[1240px] mx-auto pt-12 px-6 pb-20 text-[var(--color-body)] max-[760px]:px-4 max-[760px]:pt-7 max-[760px]:pb-[60px]"><div className="flex justify-between items-center gap-4 max-[760px]:items-start"><div><div className="text-[11px] font-bold tracking-[0.16em] text-[var(--color-primary-dark)]">ENFERMERA ESTÉTICA · ADMINISTRACIÓN</div><h1 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.035em] mt-2.5 mb-3 max-[760px]:text-[29px]">Tu agenda, en orden</h1></div>{authenticated && <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={logout}>Cerrar sesión</button>}</div>
    {checking ? <p className="mt-2.5 mb-2.5 leading-[1.65]">Comprobando sesión…</p> : !authenticated ? <form className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5 max-w-[480px] mt-[30px] mb-[30px] mx-auto" onSubmit={login}><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Acceso privado</h2><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>{error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}<button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 w-full mt-5">Entrar</button></form> : <>
      <nav className="flex gap-1.5 flex-wrap border-b border-[var(--color-highlight)] py-[18px] mb-6" aria-label="Administración">{[["calendar", "Calendario"], ["customers", "Clientas"], ["schedule", "Horarios"], ["services", "Tratamientos y cuidados"], ["operations", "Pagos y correos"], ["settings", "Configuración"]].map(([id, label]) => <button key={id} className={tab === id ? "rounded-[9px] px-[17px] py-[11px] bg-[var(--color-highlight)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-primary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50" : "rounded-[9px] px-[17px] py-[11px] bg-transparent text-[var(--color-muted)] font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {tab === "calendar" && <CalendarPanel />}{tab === "customers" && <CustomersPanel />}{tab === "schedule" && <ScheduleEditor />}{tab === "services" && <ServiceEditor />}{tab === "operations" && <Operations />}{tab === "settings" && <SettingsPanel />}
    </>}
  </section>;
}
