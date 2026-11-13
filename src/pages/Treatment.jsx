import { Link, useParams } from "react-router-dom";
import TreatmentPhoto from "../ui/TreatmentPhoto";
import usePublicCatalog from "../features/agenda/usePublicCatalog";
import { money } from "../features/agenda/api";
export default function Treatment() {
  const { serviceId } = useParams();
  const { catalog, error, retry } = usePublicCatalog();
  const service = catalog?.services.find(s => String(s.id) === serviceId);
  return <div className="public-site site-wrap treatment-page"><Link className="back-link" to="/tratamientos">← Todos los tratamientos</Link>
    {error ? <div role="alert"><h1>No pudimos cargar el tratamiento.</h1><button className="site-button" onClick={retry}>Volver a intentar</button></div> : !catalog ? <p role="status">Cargando tratamiento…</p> : !service ? <><h1>Tratamiento no disponible</h1><p>Revisa nuestro catálogo para conocer las opciones que puedes reservar.</p><Link className="site-button" to="/tratamientos">Ver tratamientos</Link></> : <>
      <p className="eyebrow">{catalog.categories.find(c => c.id === service.category_id)?.name}</p><h1>{service.name}</h1>
      <div className="treatment-detail-grid"><div><h2>Sobre el tratamiento.</h2><p className="whitespace-pre-wrap break-words" data-testid="treatment-description">{service.description}</p>{service.images?.length > 0 && <div className="treatment-gallery" aria-label="Fotos del tratamiento">{service.images.map((src, i) => <figure key={src}><TreatmentPhoto src={src} alt={service.name + " — foto " + (i + 1)} eager={i === 0} /></figure>)}</div>}<section className="care-section"><p className="eyebrow">ANTES DE TU VISITA</p><h2>Prepara tu piel.</h2><p className="care-text">{service.care || "Consulta con nosotros las indicaciones antes de tu visita."}</p></section><Link className="text-link" to="/contact">¿Tienes dudas sobre este tratamiento? Escríbenos ↗︎</Link></div>
      <aside className="treatment-summary"><p className="eyebrow">TU MOMENTO DE CUIDADO</p><dl><div><dt>Duración</dt><dd>{service.duration} minutos</dd></div><div><dt>Valor total</dt><dd>{money(service.price)}</dd></div><div><dt>Abono al reservar</dt><dd>{money(service.deposit)}</dd></div><div><dt>Saldo en atención</dt><dd>{money(service.price - service.deposit)}</dd></div></dl><Link className="site-button" to={"/reservar?tratamiento=" + service.id}>Reservar este tratamiento ↗︎</Link><p>Elige tu horario y revisa los cuidados antes de continuar al pago.</p><span>O’Higgins 280 · Concepción</span></aside></div>
    </>}
  </div>;
}
