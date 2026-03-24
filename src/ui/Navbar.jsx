import { NavLink } from "react-router-dom";
import Logo from "../ui/Logo";

function Navbar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between h-auto py-3 sm:h-20">
          {/* Logo */}
          <div className="flex justify-center w-full sm:w-auto">
            <Logo />
          </div>

          {/* Links */}
          <div className="mt-3 sm:mt-0 flex flex-wrap justify-center gap-2 sm:gap-4">
            <NavLink
              to="/home"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "text-blue-600" : "text-black hover:text-blue-500"
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/before-after"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "text-blue-600" : "text-black hover:text-blue-500"
                }`
              }
            >
              Antes y Después
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "text-blue-600" : "text-black hover:text-blue-500"
                }`
              }
            >
              Contacto
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
