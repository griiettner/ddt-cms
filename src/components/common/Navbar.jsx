import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/releases', label: 'Releases' },
    { path: '/test-sets', label: 'Test Suites' },
    { path: '/settings', label: 'Settings' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-co-blue text-white h-16 flex items-center px-6 shadow-md shrink-0">
      <div className="flex items-center gap-8 flex-1">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-white/90">
          Test Builder
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                isActive(link.path)
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/80">
          {user?.name || 'Loading...'}
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
