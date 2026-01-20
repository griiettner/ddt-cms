import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { initializeAuth } from './stores/authStore';
// Keep contexts for now during migration - will be removed in Phase 5
import { ReleaseProvider } from './context/ReleaseContext';
import { AuthProvider } from './context/AuthContext';
import './styles/index.css';

// Initialize auth store on app load
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ReleaseProvider>
          <RouterProvider router={router} />
        </ReleaseProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
