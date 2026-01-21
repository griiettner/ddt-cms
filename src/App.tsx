// Note: This App.tsx is kept for backwards compatibility.
// The actual app root layout is in router.tsx using TanStack Router's RootLayout.
// This file is no longer the main entry point.

import Navbar from '@/components/common/Navbar';

function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-co-gray-900">
      <Navbar />
      <div>App component - Use router instead</div>
    </div>
  );
}

export default App;
