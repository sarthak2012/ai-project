import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-slate-700 hover:bg-slate-200'
    }`;

  return (
    <header className="bg-white border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold text-brand-700">
          Team Task Manager
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            Projects
          </NavLink>
          <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary ml-2">
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
