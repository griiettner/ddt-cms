import AppRoutes from './routes/AppRoutes';
import Navbar from './components/common/Navbar';

function App() {
  return (
    <div className="min-h-screen bg-white text-co-gray-900">
      <Navbar />
      <AppRoutes />
    </div>
  );
}

export default App;
