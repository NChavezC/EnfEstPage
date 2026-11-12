import { useEffect, useState } from "react";
import { api, dateKey } from "./api";

export function CustomerFields({ value, onChange }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {[["first_name", "Nombre", "text"], ["last_name", "Apellidos", "text"],
      ["birth_date", "Fecha de nacimiento", "date"], ["phone", "Teléfono", "tel"], ["email", "Correo", "email"]].map(([key, label, type]) =>
      <label key={key} className="grid gap-1 text-sm">{label}
        <input className="w-full min-w-0 rounded-lg border p-3 bg-white" type={type}
          required={key !== "birth_date"} max={key === "birth_date" ? dateKey() : undefined}
          value={value[key] || ""} onChange={e => onChange({ ...value, [key]: e.target.value })} />
      </label>)}
  </div>;
}

export default function CustomerPicker({ onSelect, onNew }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    let active = true;
    setResults([]);
    setIndex(-1);
    setError("");
    if (!open) return;
    const timer = setTimeout(() => {
      api("/admin/customers?q=" + encodeURIComponent(query)).then(rows => {
        if (active) setResults(rows);
      }).catch(e => { if (active) setError(e.message); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query, open]);
  function select(customer) {
    setQuery(customer.first_name + " " + customer.last_name);
    setOpen(false);
    onSelect(customer);
  }
  return <div className="relative my-4" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label className="grid gap-1 text-sm">Buscar clienta
      <input className="rounded-lg border p-3" role="combobox" aria-expanded={open}
        aria-controls="customer-options" aria-autocomplete="list" autoComplete="off"
        aria-activedescendant={index >= 0 ? "customer-option-" + index : undefined}
        placeholder="Nombre, apellido, teléfono o correo" value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIndex(Math.min(index + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIndex(Math.max(index - 1, 0)); }
          if (e.key === "Enter" && open) { e.preventDefault(); if (results[index]) select(results[index]); }
        }} />
    </label>
    {open && <ul id="customer-options" role="listbox" className="absolute z-10 w-full max-h-56 overflow-y-auto rounded-lg border bg-white shadow-lg">
      {results.map((c, i) => <li id={"customer-option-" + i} role="option" aria-selected={i === index} key={c.id}
        tabIndex={-1} className="cursor-pointer border-b p-3 hover:bg-slate-100" onPointerDown={e => { if (e.pointerType === "mouse") e.preventDefault(); }}
        onClick={() => select(c)}>
        <strong>{c.first_name} {c.last_name}</strong><span className="block text-sm break-all">{c.phone} · {c.email}</span>
      </li>)}
      {!results.length && <li className="p-3 text-sm">Sin resultados.</li>}
    </ul>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="mt-2 rounded-lg border px-3 py-2" onClick={() => {
      setQuery(""); setOpen(false); onNew();
    }}>Nueva clienta</button>
  </div>;
}
