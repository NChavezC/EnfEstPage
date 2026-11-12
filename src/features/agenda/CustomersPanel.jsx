import { useEffect, useState } from "react";
import { api, post } from "./api";
import Modal from "./Modal";
import { CustomerFields } from "./CustomerPicker";
import { customerPayload, emptyCustomer } from "./customerData";

export default function CustomersPanel() {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => api("/admin/customers?q=" + encodeURIComponent(query) + "&offset=" + offset)
      .then(data => { if (active) { setRows(data); setError(""); } })
      .catch(e => { if (active) setError(e.message); }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query, offset, refresh]);
  function edit(customer) {
    setSelected(customer);
    setForm(customer ? Object.fromEntries(Object.keys(emptyCustomer).map(k => [k, customer[k] || ""])) : { ...emptyCustomer });
    setError("");
  }
  async function save(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const body = customerPayload(form);
      if (selected) await api("/admin/customers/" + selected.id, { method: "PUT", body: JSON.stringify({ ...body, version: selected.version }) });
      else await post("/admin/customers", body);
      setForm(null); setRefresh(n => n + 1);
    } catch (e) { setError(e.message); if (e.status === 409) setRefresh(n => n + 1); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border bg-white p-4">
    <div className="flex flex-wrap gap-3 items-end">
      <label className="grid gap-1 flex-1">Buscar clientas<input className="rounded-lg border p-3 min-w-0" value={query}
        onChange={e => { setQuery(e.target.value); setOffset(0); }} placeholder="Nombre, apellido, teléfono o correo" /></label>
      <button className="rounded-lg border p-3" onClick={() => edit(null)}>Nueva clienta</button>
    </div>
    {error && !form && <p role="alert">{error}</p>}
    <ul className="my-4 grid gap-2">{rows.map(c => <li className="rounded-lg border p-3" key={c.id}>
      <strong>{c.first_name} {c.last_name}</strong><p className="break-all">{c.phone} · {c.email}</p>
      {c.birth_date && <p>Nacimiento · {c.birth_date.split("-").reverse().join("/")}</p>}
      <button className="mt-2 rounded-lg border px-3 py-2" onClick={() => edit(c)}>Editar clienta</button>
    </li>)}</ul>
    {!rows.length && <p>Sin clientas en esta búsqueda.</p>}
    <div className="flex gap-3"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 30))}>Anterior</button>
      <button disabled={rows.length < 30} onClick={() => setOffset(offset + 30)}>Siguiente</button></div>
    {form && <Modal title={selected ? "Editar clienta" : "Nueva clienta"} onClose={() => !busy && setForm(null)}>
      <form onSubmit={save}><CustomerFields value={form} onChange={setForm} />
        {error && <p className="my-3 text-red-800" role="alert">{error}</p>}
        <button className="mt-4 rounded-lg bg-[var(--color-primary)] text-white p-3" disabled={busy}>Guardar clienta</button>
      </form>
    </Modal>}
  </section>;
}
