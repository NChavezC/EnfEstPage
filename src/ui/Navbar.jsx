import { NavLink } from "react-router-dom";
import Logo from "../ui/Logo";

function Navbar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ml-0 sm:ml-6 flex flex-wrap gap-2 sm:space-x-4">
          {/* Logo on the upper-left */}
          <div>
            <Logo />
          </div>

          {/* Space between logo and links */}
          <div className="ml-6 flex space-x-4">
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
