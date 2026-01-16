import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Releases from '../pages/Releases';
import TestSets from '../pages/TestSets';
import TestCases from '../pages/TestCases';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/releases" element={<Releases />} />
      <Route path="/test-sets" element={<TestSets />} />
      <Route path="/test-cases" element={<TestCases />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default AppRoutes;
