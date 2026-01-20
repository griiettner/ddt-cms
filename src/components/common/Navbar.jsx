import { Link, useRouterState, useParams } from '@tanstack/react-router';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user } = useAuth();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const params = useParams({ strict: false });
  const releaseId = params.releaseId || localStorage.getItem('selectedReleaseSlug') || '';

  // Check if we're on a release-specific page
  const hasRelease = !!releaseId;

  const isActive = (key) => {
    if (key === 'dashboard') {
      // Dashboard is active if we're at /:releaseId (no sub-path)
      return hasRelease && !pathname.includes('/test-sets') && !pathname.includes('/test-cases') && !pathname.includes('/settings') && pathname !== '/releases';
    }
    if (key === 'releases') return pathname === '/releases';
    if (key === 'test-sets') return pathname.includes('/test-sets');
    if (key === 'settings') return pathname.includes('/settings');
    return false;
  };

  return (
    <nav className="bg-co-blue text-white h-16 flex items-center px-6 shadow-md shrink-0">
      <div className="flex items-center gap-8 flex-1">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-white/90">
          Test Builder
        </Link>
        <div className="flex items-center gap-1">
          {/* Dashboard */}
          {hasRelease ? (
            <Link
              to="/$releaseId"
              params={{ releaseId }}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                isActive('dashboard')
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Dashboard
            </Link>
          ) : (
            <span className="px-4 py-2 rounded font-medium text-sm text-white/50 cursor-not-allowed">
              Dashboard
            </span>
          )}

          {/* Releases */}
          <Link
            to="/releases"
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
              isActive('releases')
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Releases
          </Link>

          {/* Test Sets */}
          {hasRelease ? (
            <Link
              to="/$releaseId/test-sets"
              params={{ releaseId }}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                isActive('test-sets')
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Test Sets
            </Link>
          ) : (
            <span className="px-4 py-2 rounded font-medium text-sm text-white/50 cursor-not-allowed">
              Test Sets
            </span>
          )}

          {/* Settings */}
          {hasRelease ? (
            <Link
              to="/$releaseId/settings"
              params={{ releaseId }}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                isActive('settings')
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Settings
            </Link>
          ) : (
            <span className="px-4 py-2 rounded font-medium text-sm text-white/50 cursor-not-allowed">
              Settings
            </span>
          )}
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
