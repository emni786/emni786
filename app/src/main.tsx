import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { queryClient } from './lib/queryClient';
import { ThemeBoot } from './components/layout/ThemeBoot';
import { TooltipProvider } from './components/ui/tooltip';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeBoot />
        <TooltipProvider delayDuration={150}>
          <App />
        </TooltipProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
