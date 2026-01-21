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
import Navbar from '@/components/common/Navbar';
import { ReleaseProvider } from '@/context/ReleaseContext';

// Import page components
import Dashboard from '@/pages/Dashboard';
import Releases from '@/pages/Releases';
import TestSets from '@/pages/TestSets';
import TestCases from '@/pages/TestCases';
import TestRuns from '@/pages/TestRuns';
import Settings from '@/pages/Settings';
import ReusableCaseEditor from '@/pages/ReusableCaseEditor';
import NotFound from '@/pages/NotFound';

// Root layout component
function RootLayout(): JSX.Element {
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
    const lastReleaseSlug = localStorage.getItem('selectedReleaseSlug');
    if (lastReleaseSlug) {
      throw redirect({ to: '/$releaseId', params: { releaseId: lastReleaseSlug } });
    }
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

// Define search schema type
interface TestCasesSearch {
  testSetId?: number;
}

// Test Cases route with search params for testSetId
const testCasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/test-cases',
  component: TestCases,
  validateSearch: (search: Record<string, unknown>): TestCasesSearch => ({
    testSetId: search.testSetId !== undefined ? Number(search.testSetId) : undefined,
  }),
});

// Test Runs route under release
const testRunsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/test-runs',
  component: TestRuns,
});

// Define settings search schema type
interface SettingsSearch {
  tab?: string;
}

// Settings route under release
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/settings',
  component: Settings,
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab: (search.tab as string) || undefined,
  }),
});

// Reusable Case Editor route
const reusableCaseEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$releaseId/settings/reusable-cases/$reusableCaseId',
  component: ReusableCaseEditor,
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
  reusableCaseEditorRoute,
  notFoundRoute,
  catchAllRoute,
]);

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default router;
