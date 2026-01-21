import { Link, useRouterState, useParams } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/images/logo.png';

type NavKey = 'dashboard' | 'releases' | 'test-sets' | 'test-runs' | 'settings';

function Navbar(): JSX.Element {
  const { user } = useAuth();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const params = useParams({ strict: false }) as { releaseId?: string };
  const releaseId = params.releaseId || localStorage.getItem('selectedReleaseSlug') || '';

  const hasRelease = !!releaseId;

  const isActive = (key: NavKey): boolean => {
    if (key === 'dashboard') {
      return (
        hasRelease &&
        !pathname.includes('/test-sets') &&
        !pathname.includes('/test-cases') &&
        !pathname.includes('/test-runs') &&
        !pathname.includes('/settings') &&
        pathname !== '/releases'
      );
    }
    if (key === 'releases') return pathname === '/releases';
    if (key === 'test-sets') return pathname.includes('/test-sets');
    if (key === 'test-runs') return pathname.includes('/test-runs');
    if (key === 'settings') return pathname.includes('/settings');
    return false;
  };

  const getNavLinkClass = (key: NavKey): string => {
    return `px-4 py-2 rounded font-medium text-sm transition-colors ${
      isActive(key) ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;
  };

  const disabledClass = 'px-4 py-2 rounded font-medium text-sm text-white/50 cursor-not-allowed';

  return (
    <nav className="flex h-16 shrink-0 items-center bg-co-blue px-6 text-white shadow-md">
      <div className="flex flex-1 items-center gap-8">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="rounded-lg bg-white p-1.5">
            <img src={logo} alt="Test Builder" className="h-8 w-auto" />
          </div>
          <span className="text-xl font-bold tracking-tight">Test Builder</span>
        </Link>
        <div className="flex items-center gap-1">
          {hasRelease ? (
            <Link to="/$releaseId" params={{ releaseId }} className={getNavLinkClass('dashboard')}>
              Dashboard
            </Link>
          ) : (
            <span className={disabledClass}>Dashboard</span>
          )}

          <Link to="/releases" className={getNavLinkClass('releases')}>
            Releases
          </Link>

          {hasRelease ? (
            <Link
              to="/$releaseId/test-sets"
              params={{ releaseId }}
              className={getNavLinkClass('test-sets')}
            >
              Test Sets
            </Link>
          ) : (
            <span className={disabledClass}>Test Sets</span>
          )}

          {hasRelease ? (
            <Link
              to="/$releaseId/test-runs"
              params={{ releaseId }}
              className={getNavLinkClass('test-runs')}
            >
              Test Runs
            </Link>
          ) : (
            <span className={disabledClass}>Test Runs</span>
          )}

          {hasRelease ? (
            <Link
              to="/$releaseId/settings"
              params={{ releaseId }}
              search={{}}
              className={getNavLinkClass('settings')}
            >
              Settings
            </Link>
          ) : (
            <span className={disabledClass}>Settings</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/80">{user?.name || 'Loading...'}</span>
      </div>
    </nav>
  );
}

export default Navbar;
