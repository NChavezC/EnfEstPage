import { useEffect, useState } from "react";
import Modal from "./Modal";
import { api, money } from "./api";
const empty = {
  name: "",
  price: 0,
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
    [category, setCategory] = useState(null),
    [filter, setFilter] = useState(""),
    [title, setTitle] = useState(""),
    [form, setForm] = useState(null),
    [deletion, setDeletion] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => Promise.all([api("/admin/services"), api("/admin/categories")]).then(([s, c]) => { setServices(s); setCategories(c); });
  useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);
  function edit(s, heading) {
    setTitle(heading);
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
      await load(); setCategory(null); setMessage("Categoría guardada.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/admin/" + deletion.kind + "/" + deletion.id, { method: "DELETE" });
      if (deletion.kind === "services") setForm(null);
      else { setCategory(null); setFilter(""); }
      setDeletion(null); await load(); setMessage("Eliminado correctamente. El historial de reservas se conserva.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const preview = text => text.replace(/\{(nombre|tratamiento|fecha|cuidados|saldo)\}/g, (_, k) => ({
    nombre: "Clienta de ejemplo",
    tratamiento: form.name,
    fecha: "10/12/2026 a las 12:00",
    cuidados: form.care,
    saldo: money(form.price - form.deposit)
  })[k]);
  const selected = categories.find(c => String(c.id) === filter);
  const visible = selected ? services.filter(s => s.category_id === selected.id) : services;
  const button = "rounded-[10px] border border-[var(--color-highlight)] px-4 py-2 disabled:opacity-50";
  const primary = button + " bg-[var(--color-primary)] text-white";
  const field = "rounded-[9px] border border-[var(--color-highlight)] bg-[var(--color-surface)] px-3 py-2";
  function startCategory(value) {
    setError(""); setMessage(""); setCategory(value);
  }
  function confirmDelete(kind, item) {
    setError(""); setMessage(""); setDeletion({ kind, id: item.id, name: item.name });
  }
  function cancelDelete() {
    if (!busy) { setError(""); setDeletion(null); }
  }
  return <section className="rounded-[20px] border border-[var(--color-highlight)] bg-[var(--color-surface)] p-5">
    <h2 className="mb-4 text-xl font-semibold">Categorías y tratamientos</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1">Filtrar por categoría
        <select className={field} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Todos</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <button className={button} onClick={() => startCategory({ name: "" })}>Crear categoría</button>
      <button className={primary} disabled={!categories.length}
        onClick={() => edit({ ...empty, category_id: (selected || categories[0]).id }, "Crear tratamiento")}>Crear tratamiento</button>
    </div>
    {selected && <div className="my-3 flex flex-wrap gap-2">
      <button className={button} onClick={() => startCategory(selected)}>Editar categoría</button>
      <button className={button} onClick={() => confirmDelete("categories", selected)}>Eliminar categoría</button>
    </div>}
    {message && <p role="status" className="my-3 text-green-800">{message}</p>}
    {error && !category && !form && !deletion && <p role="alert">{error}</p>}
    <ul className="mt-5 grid gap-3">
      {visible.map(s => <li key={s.id} className="rounded-xl border border-[var(--color-highlight)] p-4">
        <p className="text-sm">{categories.find(c => c.id === s.category_id)?.name}</p>
        <strong>{s.name}{!s.active && " · Inactivo"}</strong>
        <p>{money(s.price)} · Abono {money(s.deposit)} · {s.duration} min</p>
        <p className="text-sm">Versión {s.version} · Recordatorios {s.reminder_hours ? s.reminder_hours + " h antes" : "apagados"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={button} onClick={() => edit(s, "Editar tratamiento")}>Editar</button>
          <button className={button} onClick={() => {
            const name = "Copia de " + s.name;
            edit({ ...s, id: undefined, name }, name);
          }}>Copiar</button>
          <button className={button} onClick={() => confirmDelete("services", s)}>Eliminar</button>
        </div>
      </li>)}
    </ul>
    {!visible.length && <p className="my-4">No hay tratamientos en esta selección.</p>}
    {category && <Modal title={category.id ? "Editar categoría" : "Crear categoría"} onClose={() => !busy && setCategory(null)}>
      <form onSubmit={saveCategory}>
        <label className="my-4 grid gap-2">Nombre de la categoría
          <input className={field} required minLength={2} maxLength={100} value={category.name}
            onChange={e => setCategory({ ...category, name: e.target.value })} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className={primary} disabled={busy}>Guardar categoría</button>
      </form>
    </Modal>}
    {form && <Modal title={title} onClose={() => !busy && setForm(null)}><form onSubmit={save}><label className="flex flex-col gap-1.5 text-sm font-[550] my-3">Categoría<select aria-label="Categoría" required value={form.category_id} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 w-full bg-[var(--color-surface)]">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Nombre<input required value={form.name} onChange={e => setForm({
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
      <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Variables: {"{nombre}, {tratamiento}, {fecha}, {cuidados}, {saldo}"}</p><label className="grid gap-2 text-sm">Vista previa del correo de confirmación<textarea readOnly className="h-32 w-full resize-none overflow-y-auto p-3 border rounded-[10px]" value={preview(form.confirmation)} /></label>
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
    </form></Modal>}
    {deletion && <Modal title={deletion.kind === "services" ? "Eliminar tratamiento" : "Eliminar categoría"} onClose={cancelDelete}><p className="my-3">¿Eliminar «{deletion.name}»?</p><p className="my-3">{deletion.kind === "services" ? "Dejará de aparecer en el catálogo y en la lista de tratamientos. Las citas existentes, sus pagos y correos se conservarán y podrán seguir gestionándose." : "Solo se puede eliminar una categoría vacía. Primero mueve o elimina sus tratamientos, incluidos los inactivos."}</p>{error && <p role="alert" className="p-3 my-3 rounded-xl bg-red-50 text-red-800">{error}</p>}<div className="flex gap-3 flex-wrap mt-5"><button type="button" disabled={busy} onClick={cancelDelete} className="px-4 py-2 border rounded-[10px]">Cancelar</button><button type="button" disabled={busy} onClick={remove} className="px-4 py-2 rounded-[10px] bg-red-700 text-white disabled:opacity-50">{busy ? "Eliminando…" : "Confirmar eliminación"}</button></div></Modal>}
  </section>;
}
