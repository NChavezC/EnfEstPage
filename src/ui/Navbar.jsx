import { Link, NavLink } from "react-router-dom";
import Logo from "../ui/Logo";

function Navbar() {
  const getLinkClasses = ({ isActive }) =>
    [
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-[var(--color-highlight)] text-[var(--color-primary-dark)]"
        : "text-[var(--color-body)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary-hover)]",
    ].join(" ");

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-auto flex-col items-center py-3 sm:h-20 sm:flex-row sm:justify-between">
          {/* Logo */}
          <div className="flex w-full justify-center sm:w-auto">
            <Link
              to="/home"
              aria-label="Ir a la página de inicio"
              className="flex items-center justify-center"
            >
              <Logo />
            </Link>
          </div>

          {/* Navigation links */}
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:mt-0 sm:gap-4">
            <NavLink to="/home" className={getLinkClasses}>
              Home
            </NavLink>

            <NavLink to="/before-after" className={getLinkClasses}>
              Antes y Después
            </NavLink>

            <NavLink to="/contact" className={getLinkClasses}>
              Contacto
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
