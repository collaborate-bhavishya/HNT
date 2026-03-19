import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import LandingPage from './pages/LandingPage';
import ApplyPage from './pages/ApplyPage';
import AssessmentPage from './pages/AssessmentPage';
import AdminDashboard from './pages/AdminDashboard';
import CandidateLogin from './pages/CandidateLogin';
import CandidateDashboard from './pages/CandidateDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/assessment/:token" element={<AssessmentPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/candidate-login" element={<CandidateLogin />} />
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
