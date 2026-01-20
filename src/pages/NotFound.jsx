import { Link } from '@tanstack/react-router';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-6xl mb-4">404</div>
      <h1 className="text-2xl font-bold text-co-blue mb-2">Page Not Found</h1>
      <p className="text-co-gray-500 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
