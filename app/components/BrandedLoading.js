import React from 'react';
import LoadingScreen from '../../components/mediakit/LoadingScreen';

/**
 * Branded loading state (build-64 mediakit LoadingScreen: gradient logo +
 * 0-100% progress bar) with self-driving progress, replacing the generic
 * ActivityIndicator circles. Progress advances to 95% while waiting and is
 * unmounted by the parent when real data arrives.
 */
export default function BrandedLoading({ message = 'Loading market data...' }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + 3));
    }, 60);
    return () => clearInterval(timer);
  }, []);

  return <LoadingScreen message={message} showProgress progress={progress} />;
}
