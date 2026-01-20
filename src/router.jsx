/**
 * TanStack Router Configuration
 * Code-based routing for the application
 */
import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import Navbar from './components/common/Navbar';

// Import page components (folder-based structure)
import Dashboard from './pages/Dashboard/index';
import Releases from './pages/Releases/index';
import TestSets from './pages/TestSets/index';
import TestCases from './pages/TestCases/index';
import Settings from './pages/Settings/index';
import NotFound from './pages/NotFound';

// Root layout component
function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-co-gray-900">
      <Navbar />
      <Outlet />
    </div>
  );
}

// Root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Dashboard route (index)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

// Releases route
const releasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/releases',
  component: Releases,
});

// Test Sets route
const testSetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/test-sets',
  component: TestSets,
});

// Test Cases route with search params for testSetId
const testCasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/test-cases',
  component: TestCases,
  validateSearch: (search) => ({
    testSetId: search.testSetId || undefined,
  }),
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
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
  testSetsRoute,
  testCasesRoute,
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
