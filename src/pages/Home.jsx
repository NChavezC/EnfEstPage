import { Link } from "react-router-dom";
export default function Home() {
  return <div className="public-site">
    <section className="site-wrap home-hero">
      <div><p className="eyebrow">ENFERMERÍA + COSMETOLOGÍA · CONCEPCIÓN</p>
        <h1>Tu piel.<br />Tu tiempo.<br /><em>Tu cuidado.</em></h1>
        <p className="hero-copy">Un espacio para cuidar tu piel con atención profesional, dedicación y un tratamiento pensado para ti.</p>
        <div className="site-actions"><Link className="site-button" to="/reservar">Reserva tu hora <span aria-hidden="true">↗︎</span></Link><Link className="text-link" to="/tratamientos">Explora los tratamientos</Link></div>
      </div>
      <div className="hero-brand"><span className="brand-top">ENFERMERA ESTÉTICA</span><img src="/logo-new-rosa.jpeg" alt="" /><p>Cuidar también es<br /><em>tomarse el tiempo.</em></p><span className="brand-bottom">ATENCIÓN PERSONALIZADA</span></div>
      <div className="hero-foot"><span>O’Higgins 280 · Concepción</span><a href="#enfoque">Conoce nuestra forma de cuidar <span aria-hidden="true">↓</span></a></div>
    </section>
    <section id="enfoque" className="approach-section"><div className="site-wrap editorial-grid"><p className="eyebrow">EL CUIDADO EMPIEZA POR ESCUCHAR</p><div><h2>Formación profesional.<br /><em>Atención cercana.</em></h2><p>La formación de enfermera y cosmetóloga se integra en una atención que considera tu piel, tus hábitos y lo que buscas para ti.</p><p>Nos tomamos el tiempo para escucharte, evaluar tus necesidades y explicarte el tratamiento. Cada atención sigue protocolos de trabajo y contempla orientación sobre los cuidados de tu piel.</p></div></div></section>
    <section className="site-wrap experience-section"><div className="section-heading"><p className="eyebrow">TU EXPERIENCIA</p><h2>Tiempo dedicado<br /><em>a ti.</em></h2></div><ol className="experience-list">
      <li><span>01</span><div><h3>Escuchar y evaluar</h3><p>Conversamos sobre tus objetivos y las necesidades de tu piel antes de comenzar.</p></div></li>
      <li><span>02</span><div><h3>Personalizar la atención</h3><p>Definimos el cuidado y te explicamos el procedimiento para que sepas qué esperar.</p></div></li>
      <li><span>03</span><div><h3>Acompañar tu cuidado</h3><p>Recibes indicaciones para prepararte y continuar cuidando tu piel después de la atención.</p></div></li>
    </ol></section>
    <section className="closing-section"><div className="site-wrap"><p className="eyebrow">UN MOMENTO PARA TI</p><h2>El primer paso es<br /><em>encontrar tu espacio.</em></h2><Link className="site-button light" to="/tratamientos">Encuentra tu tratamiento <span aria-hidden="true">↗︎</span></Link></div></section>
  </div>;
}
