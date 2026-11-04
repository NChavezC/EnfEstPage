import { useEffect, useState } from "react";
import { api, money } from "./api";
const empty = {
  name: "Nuevo tratamiento",
  price: 28000,
  deposit: 10000,
  duration: 120,
  care: "CUIDADOS PREVIOS",
  confirmation: "Hola {nombre}, tu reserva de {tratamiento} para {fecha} está confirmada. Cuidados: {cuidados}",
  reminder: "Hola {nombre}, recuerda tu cita de {tratamiento} el {fecha}. {cuidados}",
  reminder_hours: null,
  active: true
};
export default function ServiceEditor() {
  const [services, setServices] = useState([]),
    [categories, setCategories] = useState([]),
    [category, setCategory] = useState({ name: "" }),
    [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => Promise.all([api("/admin/services"), api("/admin/categories")]).then(([s, c]) => { setServices(s); setCategories(c); });
  useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);
  function edit(s) {
    setForm({
      ...s
    });
    setMessage("");
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const {
        id,
        version,
        ...body
      } = form;
      void version;
      await api("/admin/services" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      });
      await load();
      setMessage("Tratamiento guardado. Las reservas anteriores conservan sus precios y cuidados.");
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveCategory(e) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await api("/admin/categories" + (category.id ? "/" + category.id : ""), {
        method: category.id ? "PUT" : "POST", body: JSON.stringify({ name: category.name })
      });
      await load(); setCategory({ name: "" }); setMessage("Categoría guardada.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const preview = text => text.replace(/\{(nombre|tratamiento|fecha|cuidados|saldo)\}/g, (_, k) => ({
    nombre: "Clienta de ejemplo",
    tratamiento: form.name,
    fecha: "10/12/2026 a las 12:00",
    cuidados: form.care,
    saldo: money(form.price - form.deposit)
  })[k]);
  return <div className="grid grid-cols-2 gap-6 max-[760px]:grid-cols-1"><section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5"><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Categorías y tratamientos</h2><form onSubmit={saveCategory} className="mb-6"><label className="flex flex-col gap-1.5 text-sm font-[550] my-3">{category.id ? "Editar categoría" : "Nueva categoría"}<input required minLength={2} maxLength={100} value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 w-full bg-[var(--color-surface)]" /></label><div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-[10px] px-4 py-2 bg-[var(--color-primary)] text-white disabled:opacity-50">{category.id ? "Guardar categoría" : "Crear categoría"}</button>{category.id && <button type="button" onClick={() => setCategory({ name: "" })} className="px-4 py-2">Cancelar</button>}</div></form><div className="flex flex-wrap gap-2 mb-5">{categories.map(c => <button key={c.id} onClick={() => setCategory(c)} className="rounded-[10px] border border-[var(--color-highlight)] px-3 py-2 text-sm" aria-label={"Editar categoría " + c.name}>{c.name} · Editar</button>)}</div>{error && <p role="alert" className="p-3 my-3 rounded-xl bg-red-50 text-red-800">{error}</p>}<div className="grid gap-2.5 mb-[30px]">{services.map(s => <button key={s.id} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-body)] font-semibold border border-[var(--color-highlight)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50 text-left flex flex-col gap-[7px]" onClick={() => edit(s)}><span className="text-[12px] text-[var(--color-muted)]">{categories.find(c => c.id === s.category_id)?.name}</span><strong>{s.name}{!s.active ? " · Inactivo" : ""}</strong><span className="text-[13px] font-normal">{money(s.price)} · Abono {money(s.deposit)} · {s.duration} min</span><span className="text-[13px] font-normal">Versión {s.version} · Recordatorios {s.reminder_hours ? s.reminder_hours + " h antes" : "apagados"}</span></button>)}</div><button disabled={!categories.length} onClick={() => edit({ ...empty, category_id: categories[0]?.id })} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Añadir tratamiento</button>{message && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-green-50 text-green-800">{message}</p>}</section>
    <section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5">{form ? <form onSubmit={save}><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">{form.id ? "Editar tratamiento" : "Nuevo tratamiento"}</h2><label className="flex flex-col gap-1.5 text-sm font-[550] my-3">Categoría<select aria-label="Categoría" required value={form.category_id} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 w-full bg-[var(--color-surface)]">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Nombre<input required value={form.name} onChange={e => setForm({
            ...form,
            name: e.target.value
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1">{[["price", "Precio total CLP"], ["deposit", "Abono CLP"], ["duration", "Duración (min)"]].map(([key, label]) => <label key={key} className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">{label}<input type="number" required min="1" value={form[key]} onChange={e => setForm({
              ...form,
              [key]: Number(e.target.value)
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>)}</div>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Cuidados previos<textarea aria-label="Cuidados previos" required value={form.care} onChange={e => setForm({
            ...form,
            care: e.target.value
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal min-h-[110px]" /></label><p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Se muestran antes de reservar y se guardan con la aceptación de la clienta.</p>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Correo de confirmación<textarea aria-label="Correo de confirmación" required value={form.confirmation} onChange={e => setForm({
            ...form,
            confirmation: e.target.value
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal min-h-[110px]" /></label>
      <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Variables: {"{nombre}, {tratamiento}, {fecha}, {cuidados}, {saldo}"}</p><div className="whitespace-pre-wrap p-4 border border-dashed border-[var(--color-border)] rounded-[10px] text-sm">{preview(form.confirmation)}</div>
      <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={form.reminder_hours !== null} onChange={e => setForm({
            ...form,
            reminder_hours: e.target.checked ? 24 : null
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />Activar recordatorio por correo para nuevas reservas</label>
      {form.reminder_hours !== null && <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Horas antes de la cita<input type="number" min="1" max="720" value={form.reminder_hours} onChange={e => setForm({
            ...form,
            reminder_hours: Number(e.target.value)
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>}
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Texto del recordatorio<textarea aria-label="Texto del recordatorio" required value={form.reminder} onChange={e => setForm({
            ...form,
            reminder: e.target.value
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal min-h-[110px]" /></label>
      <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={form.active} onChange={e => setForm({
            ...form,
            active: e.target.checked
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />Tratamiento disponible para nuevas reservas</label>
      {error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}<button disabled={busy} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Guardando…" : "Guardar tratamiento"}</button>
    </form> : <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-[var(--color-background)] text-[var(--color-muted)]">Selecciona un tratamiento para editar sus precios, cuidados y correos.</p>}</section>
  </div>;
}
