type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps): JSX.Element {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-co-gray-200 border-t-co-blue`}
      />
    </div>
  );
}

export default LoadingSpinner;
