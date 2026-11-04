export async function api(path, options = {}) {
  const response = await fetch("/api/agenda" + path, {
    credentials: "same-origin", ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data.detail === "string" ? data.detail :
      Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(". ") : "No pudimos completar la solicitud.";
    const error = new Error(message); error.status = response.status; throw error;
  }
  return data;
}
export function post(path, body = {}) { return api(path, {method:"POST",body:JSON.stringify(body)}); }
export const money = value => new Intl.NumberFormat("es-CL", {style:"currency",currency:"CLP",maximumFractionDigits:0}).format(value);
export const dateKey = (value = new Date()) => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
export const clock = value => new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));
export const dateLabel = value => new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
export function addDays(day, amount) { const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10); }
export function chileISO(local) {
  const naive=new Date(local+"Z").getTime(); let guess=naive;
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Santiago",timeZoneName:"longOffset"}).formatToParts(new Date(guess));
    const offset=parts.find(p=>p.type==="timeZoneName").value.match(/GMT([+-])(\d{2}):(\d{2})/);
    const minutes=offset ? (offset[1]==="-"?-1:1)*(Number(offset[2])*60+Number(offset[3])) : 0;
    guess=naive-minutes*60000;
  }
  return new Date(guess).toISOString();
}
export const labels={held:"Retenida",confirmed:"Confirmada",expired:"Vencida",cancelled:"Cancelada",blocked:"Bloqueo",payment_review:"Pago por revisar"};
