import { Link } from '@tanstack/react-router';

function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl">404</div>
      <h1 className="mb-2 text-2xl font-bold text-co-blue">Page Not Found</h1>
      <p className="mb-6 text-co-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
