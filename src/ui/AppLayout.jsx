import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
export default function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <div className="flex flex-col min-h-screen"><a className="skip-link" href="#contenido">Saltar al contenido</a><Navbar /><main id="contenido" className="flex-1" tabIndex={-1}><Outlet /></main>{!pathname.startsWith("/admin") && <Footer />}</div>;
}
