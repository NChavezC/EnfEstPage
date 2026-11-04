import { useEffect, useState } from "react";
import { api, post, dateKey, dateLabel } from "./api";
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const blank = {
  closed: false,
  starts: ["09:00", "11:10", "13:40"],
  shift_start: "09:00",
  shift_end: "17:00",
  duration: 120,
  buffer: 10,
  breaks: [{
    start: "13:10",
    end: "13:40"
  }],
  final_buffer: false
};
export default function ScheduleEditor() {
  const [rules, setRules] = useState([]),
    [selected, setSelected] = useState([0]),
    [exception, setException] = useState(false);
  const [effective, setEffective] = useState(dateKey()),
    [specific, setSpecific] = useState(dateKey());
  const [plan, setPlan] = useState(blank),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setRules(await api("/admin/schedule"));
  }
  useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);
  function change(next) {
    setPlan(next);
    setPreview(null);
    setMessage("");
  }
  function copy(row) {
    change({
      ...blank,
      ...row.plan
    });
    setSelected(row.weekday === null ? [] : [row.weekday]);
    setException(row.specific_date !== null);
    if (row.specific_date) setSpecific(row.specific_date);
  }
  async function save(apply = false) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await post("/admin/schedule?preview=" + !apply, {
        weekdays: exception ? [] : selected,
        specific_date: exception ? specific : null,
        effective_from: effective,
        plan
      });
      setPreview(result);
      if (result.saved) {
        setMessage("Horario guardado. Las reservas existentes se conservaron.");
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="grid grid-cols-2 gap-6 max-[760px]:grid-cols-1"><section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5"><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Horarios guardados</h2><p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)]">Carga un día como base y aplícalo a uno o varios días. Los cambios tienen fecha de vigencia.</p>
    <div className="overflow-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Día / fecha</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top">Vigencia e inicios</th><th className="text-left p-3 border-b border-[var(--color-highlight)] align-top"></th></tr></thead><tbody>{rules.map(r => <tr key={r.id}><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top">{r.specific_date || days[r.weekday]}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top"><small>Desde {r.effective_from}</small><br />{r.plan.closed ? "Cerrado" : r.plan.starts.join(" · ")}</td><td className="text-left p-3 border-b border-[var(--color-highlight)] align-top"><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => copy(r)}>Cargar</button></td></tr>)}</tbody></table></div>
  </section><section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5"><h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">Configurar horario</h2>
    <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={exception} onChange={e => {
          setException(e.target.checked);
          setPreview(null);
        }} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />Excepción para una fecha concreta</label>
    {exception ? <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Fecha<input type="date" value={specific} onChange={e => {
          setSpecific(e.target.value);
          setPreview(null);
        }} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label> : <>
      <div className="flex gap-2.5 flex-wrap mt-4 mb-4">{days.map((d, i) => <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center" key={d}><input type="checkbox" checked={selected.includes(i)} onChange={e => {
              setSelected(e.target.checked ? [...selected, i] : selected.filter(x => x !== i));
              setPreview(null);
            }} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />{d}</label>)}</div>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Aplicar desde<input type="date" value={effective} onChange={e => {
            setEffective(e.target.value);
            setPreview(null);
          }} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>
    </>}
    <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={plan.closed} onChange={e => change({
          ...plan,
          closed: e.target.checked
        })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />Cerrado / vacaciones</label>
    {!plan.closed && <>
      <div className="grid grid-cols-2 gap-x-[18px] max-[760px]:grid-cols-1"><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Inicio de jornada<input type="time" value={plan.shift_start} onChange={e => change({
              ...plan,
              shift_start: e.target.value
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Salida<input type="time" value={plan.shift_end} onChange={e => change({
              ...plan,
              shift_end: e.target.value
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>
      <label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Capacidad por cita (min)<input type="number" min="10" max="480" value={plan.duration} onChange={e => change({
              ...plan,
              duration: Number(e.target.value)
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Descanso (min)<input type="number" min="0" max="120" value={plan.buffer} onChange={e => change({
              ...plan,
              buffer: Number(e.target.value)
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label></div>
      <label className="flex flex-row gap-2.5 text-sm font-[550] mt-3 mb-3 items-center"><input type="checkbox" checked={plan.final_buffer} onChange={e => change({
            ...plan,
            final_buffer: e.target.checked
          })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-[18px] text-[var(--color-body)] font-normal h-[18px] accent-[var(--color-primary)]" />Exigir descanso también después de la última cita</label>
      <h3 className="text-[17px] font-[650] mt-3 mb-3">Inicios ofrecidos</h3>{plan.starts.map((s, i) => <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end" key={i}><label className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">Cita {i + 1}<input type="time" value={s} onChange={e => change({
              ...plan,
              starts: plan.starts.map((v, j) => i === j ? e.target.value : v)
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label><span>{plan.duration} minutos</span><button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => change({
            ...plan,
            starts: plan.starts.filter((_, j) => i !== j)
          })} aria-label={"Quitar cita " + (i + 1)}>×</button></div>)}
      <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => change({
          ...plan,
          starts: [...plan.starts, "09:00"]
        })}>Añadir inicio</button>
      <h3 className="text-[17px] font-[650] mt-3 mb-3">Almuerzo y pausas fijas</h3>{plan.breaks.map((b, i) => <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end" key={i}>{["start", "end"].map(k => <label key={k} className="flex flex-col gap-1.5 text-sm font-[550] mt-3 mb-3">{k === "start" ? "Desde" : "Hasta"}<input type="time" value={b[k]} onChange={e => change({
              ...plan,
              breaks: plan.breaks.map((v, j) => i === j ? {
                ...v,
                [k]: e.target.value
              } : v)
            })} className="border border-[var(--color-highlight)] rounded-[9px] px-3 py-2.5 bg-[var(--color-surface)] min-w-0 w-full text-[var(--color-body)] font-normal" /></label>)}<button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => change({
            ...plan,
            breaks: plan.breaks.filter((_, j) => i !== j)
          })} aria-label="Quitar pausa">×</button></div>)}
      <button className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => change({
          ...plan,
          breaks: [...plan.breaks, {
            start: "13:00",
            end: "13:30"
          }]
        })}>Añadir pausa</button>
      <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">El almuerzo incluye el descanso. La salida no crea horas de atención adicionales. Los tratamientos deben caber en los bloques.</p>
    </>}
    {error && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error}</p>}{message && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-green-50 text-green-800" role="status">{message}</p>}
    {preview && !preview.saved && <div className={preview.conflicts.length ? "px-[18px] py-3.5 rounded-xl mt-[18px] mb-[18px] leading-[1.6] bg-red-50 text-red-800" : "px-[18px] py-3.5 rounded-xl mt-[18px] mb-[18px] leading-[1.6] bg-green-50 text-green-800"}>{preview.conflicts.length ? <><strong>Hay reservas afectadas. No se guardó el cambio.</strong>{preview.conflicts.map(c => <p key={c.id} className="mt-2.5 mb-2.5 leading-[1.65]">{c.name} · {dateLabel(c.starts_at)}</p>)}</> : "Sin conflictos con reservas existentes. Puedes guardar el horario."}</div>}
    <div className="flex gap-2.5 flex-wrap mt-4 mb-4"><button disabled={busy || !exception && !selected.length} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => save(false)}>Revisar cambios</button><button disabled={busy || !preview || preview.saved || preview.conflicts.length > 0} onClick={() => save(true)} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Guardar horario</button></div>
  </section></div>;
}
