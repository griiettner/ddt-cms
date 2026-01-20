/**
 * TanStack Router Configuration
 * Code-based routing for the application
 *
 * URL Structure:
 * - /releases - Releases management page
 * - /:releaseId - Dashboard for a specific release
 * - /:releaseId/test-sets - Test Sets for a release
 * - /:releaseId/test-cases - Test Cases for a release
 * - /:releaseId/test-runs - Test Run history for a release
 * - /:releaseId/settings - Settings for a release
 */
import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import Navbar from './components/common/Navbar';
import { ReleaseProvider } from './context/ReleaseContext';

// Import page components (folder-based structure)
import Dashboard from './pages/Dashboard/index';
import Releases from './pages/Releases/index';
import TestSets from './pages/TestSets/index';
import TestCases from './pages/TestCases/index';
import TestRuns from './pages/TestRuns/index';
import Settings from './pages/Settings/index';
import NotFound from './pages/NotFound';

// Root layout component
function RootLayout() {
  return (
    <ReleaseProvider>
      <div className="min-h-screen bg-white text-co-gray-900">
        <Navbar />
        <Outlet />
      </div>
    </ReleaseProvider>
  );
}

// Root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Index route - redirects to releases or last selected release
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // Check localStorage for last selected release slug
    const lastReleaseSlug = localStorage.getItem('selectedReleaseSlug');
    if (lastReleaseSlug) {
      throw redirect({ to: '/$releaseId', params: { releaseId: lastReleaseSlug } });
    }
    // No release selected, go to releases page
    throw redirect({ to: '/releases' });
  },
});

// Releases route (no releaseId in URL)
const releasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/releases',
  component: Releases,
});

// Release-specific routes with releaseId param
const releaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId',
  component: Dashboard,
});

// Test Sets route under release
const testSetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/test-sets',
  component: TestSets,
});

// Test Cases route with search params for testSetId
const testCasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/test-cases',
  component: TestCases,
  validateSearch: (search) => ({
    testSetId: search.testSetId || undefined,
  }),
});

// Test Runs route under release
const testRunsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/test-runs',
  component: TestRuns,
});

// Settings route under release
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/settings',
  component: Settings,
});

// 404 route
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/404',
  component: NotFound,
});

// Catch-all route redirects to 404
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => {
    throw redirect({ to: '/404' });
  },
});

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  releasesRoute,
  releaseRoute,
  testSetsRoute,
  testCasesRoute,
  testRunsRoute,
  settingsRoute,
  notFoundRoute,
  catchAllRoute,
]);

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

export default router;
