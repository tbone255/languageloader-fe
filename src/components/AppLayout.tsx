/**
 * AppLayout
 *
 * Persistent navigation shell for the app.
 * Uses DaisyUI navbar component.
 */

import { NavLink } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
            >
              <li>
                <NavLink to="/learn">Learn</NavLink>
              </li>
              <li>
                <NavLink to="/review">Review</NavLink>
              </li>
              <li>
                <NavLink to="/settings">Settings</NavLink>
              </li>
            </ul>
          </div>
          <NavLink to="/learn" className="btn btn-ghost text-xl">
            LanguageLoader
          </NavLink>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <NavLink
                to="/learn"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Learn
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/review"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Review
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Settings
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="navbar-end">
          <ThemeSwitcher />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4">{children}</main>
    </div>
  );
}
