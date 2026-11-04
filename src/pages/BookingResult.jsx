import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, post, money, dateLabel, labels } from "../features/agenda/api";
import { bookingReturnToken } from "../features/agenda/returnToken";
export default function BookingResult() {
  const { bookingToken } = useParams();
  const { search } = useLocation();
  const token = bookingReturnToken(bookingToken, search, sessionStorage.getItem("agenda_last_token"));
  const [booking, setBooking] = useState(null),
    [error, setError] = useState(""),
    [fetchError, setFetchError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const [mode, setMode] = useState(null);
  useEffect(() => {
    api("/catalog").then(c => setMode(c.payment_mode)).catch(() => {});
  }, []);
  useEffect(() => {
    setBooking(null);
    setError("");
    setFetchError("");
    if (!token) return;
    let active = true;
    const refresh = () => api("/bookings/" + encodeURIComponent(token)).then(b => {
      if (active) {
        setBooking(b);
        setFetchError("");
      }
    }).catch(e => {
      if (active) setFetchError(e.message);
    });
    refresh();
    const timer = setInterval(refresh, 4000),
      clockTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(clockTimer);
    };
  }, [token]);
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const data = await post("/bookings/" + token + "/checkout");
      window.location.assign(data.checkout_url);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function simulate(result) {
    setBusy(true);
    try {
      await post("/bookings/" + token + "/simulate?result=" + result);
      setBooking(await api("/bookings/" + token));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const remaining = booking?.expires_at ? Math.max(0, Math.ceil((new Date(booking.expires_at) - now) / 1000)) : 0;
  return <section className="max-w-[740px] mx-auto pt-12 px-6 pb-20 text-[var(--color-body)] max-[760px]:px-4 max-[760px]:pt-7 max-[760px]:pb-[60px]"><section className="bg-[var(--color-surface)] border border-[var(--color-highlight)] rounded-[20px] p-[26px] shadow-[0_6px_28px_#55323d06] max-[760px]:p-5">
    <div className="text-[11px] font-bold tracking-[0.16em] text-[var(--color-primary-dark)]">TU RESERVA · ENFERMERA ESTÉTICA</div>
    <h1 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.035em] mt-2.5 mb-3">{booking ? labels[booking.status] : "Consultando tu reserva…"}</h1>
    {!token && <p role="alert" className="mt-2.5 mb-2.5 leading-[1.65]">No se encontró el enlace de tu reserva.</p>}
    {(error || fetchError) && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-red-50 text-red-800" role="alert">{error || fetchError}</p>}
    {booking && <>
      <h2 className="text-[21px] font-[650] mt-3.5 mb-3.5">{booking.treatment}</h2><p className="mt-2.5 mb-2.5 leading-[1.65]">{dateLabel(booking.starts_at)}</p><p className="mt-2.5 mb-2.5 leading-[1.65]">{booking.professional}</p>
      <dl className="mt-6 mb-6"><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)]"><dt>Valor total</dt><dd className="font-[650]">{money(booking.price)}</dd></div><div className="flex justify-between gap-4 py-3 border-b border-[var(--color-highlight)]"><dt>Abono</dt><dd className="font-[650]">{money(booking.deposit)}</dd></div></dl>
      {booking.status === "held" && <><p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">Tu horario está retenido por {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}. La reserva aún no está confirmada.</p>
        {(!booking.payment || ["ready", "pending"].includes(booking.payment.status)) && remaining > 0 && <button disabled={busy} onClick={checkout} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Conectando…" : booking.payment ? "Volver al pago" : "Pagar abono y confirmar"}</button>}
        {booking.payment?.status === "creating" && <p className="mt-2.5 mb-2.5 leading-[1.65]" role="status">Preparando tu pago con TUU…</p>}
        {booking.payment?.status === "unknown" && <p className="mt-2.5 mb-2.5 leading-[1.65]">No pudimos determinar el resultado del intento. No realices otro pago; contacta al centro con el código {booking.payment.reference}.</p>}
      </>}
      {mode === "mock" && booking.payment && ["held", "expired"].includes(booking.status) && <div className="px-[18px] py-3.5 rounded-xl mt-[18px] mb-[18px] leading-[1.6] bg-amber-50 text-amber-900 border border-amber-200"><strong>Simulador local — sin cobros</strong><p className="mt-2.5 mb-2.5 leading-[1.65]">Permite probar aprobación, rechazo y pagos tardíos.</p><div className="flex gap-2.5 flex-wrap mt-4 mb-4"><button disabled={busy} onClick={() => simulate("completed")} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-primary)] text-white font-semibold border border-transparent cursor-pointer transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">Simular pago aprobado</button><button disabled={busy} className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => simulate("failed")}>Simular rechazo</button></div></div>}
      {booking.status === "confirmed" && <><p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-green-50 text-green-800">Tu cita está confirmada. Guarda este enlace para consultarla.</p><h3 className="text-[17px] font-[650] mt-3 mb-3">Cuidados previos</h3><div className="whitespace-pre-wrap bg-[var(--color-background)] rounded-xl p-5 leading-[1.7] mt-[18px] mb-[18px]">{booking.care}</div></>}
      {booking.status === "payment_review" && <p className="mt-[18px] mb-[18px] leading-[1.6] px-[18px] py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">Recibimos tu pago después de perder la retención. Tu cita requiere revisión del centro; no vuelvas a pagar. Referencia: {booking.payment?.reference}</p>}
      {booking.status === "expired" && <p className="mt-2.5 mb-2.5 leading-[1.65]">La retención venció. Si realizaste un pago, espera la actualización o contacta al centro antes de intentar nuevamente.</p>}
      {booking.status === "cancelled" && <p className="mt-2.5 mb-2.5 leading-[1.65]">Esta reserva está cancelada. Consulta al centro si necesitas revisar un pago o devolución.</p>}
      <p className="mt-2.5 mb-2.5 leading-[1.65] text-[var(--color-muted)] text-[13px]">Código de reserva: {booking.id}</p>
    </>}
    <Link to="/reservar">Volver a los tratamientos</Link>
  </section></section>;
}
