import { Link } from "react-router-dom";
import usePublicCatalog from "../features/agenda/usePublicCatalog";
import { money } from "../features/agenda/api";
export default function Treatments() {
  const { catalog, error, retry } = usePublicCatalog();
  return <div className="public-site site-wrap treatments-page"><p className="eyebrow">NUESTROS TRATAMIENTOS</p><div className="page-intro"><h1>Un cuidado<br /><em>para tu piel.</em></h1><p>Conoce los tratamientos disponibles, revisa sus cuidados y elige tu próximo momento de atención.</p></div>
    {error ? <div role="alert"><p>No pudimos cargar los tratamientos.</p><button className="site-button" onClick={retry}>Volver a intentar</button></div> : !catalog ? <p role="status">Cargando tratamientos…</p> : !catalog.services.length ? <p>Por ahora no hay tratamientos disponibles. <Link className="text-link" to="/contact">Contáctanos para orientarte.</Link></p> : catalog.categories.map(category => <section className="treatment-category" key={category.id}><h2>{category.name}</h2><div>{catalog.services.filter(service => service.category_id === category.id).map(service => <Link className="treatment-row" key={service.id} to={"/tratamientos/" + service.id}><h3>{service.name}</h3><span className="treatment-meta">{service.duration} min <span>·</span> {money(service.price)}</span><span className="treatment-arrow" aria-hidden="true">↗︎</span><span className="sr-only">Ver tratamiento</span></Link>)}</div></section>)}
    <div className="catalog-note"><p>¿No sabes cuál elegir?</p><Link className="text-link" to="/contact">Conversemos sobre lo que buscas ↗︎</Link></div>
  </div>;
}
