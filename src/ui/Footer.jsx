import { Link } from "react-router-dom";
export default function Footer() {
  return <footer className="site-footer"><div className="site-wrap footer-grid"><div><Link to="/home" className="footer-brand">Enfermera Estética</Link><p>Enfermería + cosmetología.<br />Cuidado personalizado en Concepción.</p></div><div><p className="eyebrow">ENCUÉNTRANOS</p><Link to="/contact">O’Higgins 280, Concepción</Link><a href="https://www.instagram.com/esteticaenfermera/" target="_blank" rel="noreferrer">Instagram ↗︎</a></div><div><p className="eyebrow">TU PRÓXIMA VISITA</p><Link to="/tratamientos">Explora los tratamientos</Link><Link to="/reservar">Reserva tu hora ↗︎</Link></div></div><div className="site-wrap footer-bottom">© {new Date().getFullYear()} Enfermera Estética</div></footer>;
}
