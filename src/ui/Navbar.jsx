import { NavLink, Link } from "react-router-dom";
export default function Navbar() {
  return <header className="site-header"><nav className="site-wrap site-nav" aria-label="Navegación principal">
    <Link to="/home" className="site-logo" aria-label="Enfermera Estética · Inicio"><img src="/logo-new-largo-rosa.jpeg" alt="Enfermera Estética" /></Link>
    <div className="site-nav-links"><NavLink to="/home">Inicio</NavLink><NavLink to="/tratamientos">Tratamientos</NavLink><NavLink to="/contact">Contacto</NavLink><NavLink to="/reservar" className="nav-book">Reservar <span aria-hidden="true">↗︎</span></NavLink></div>
  </nav></header>;
}
