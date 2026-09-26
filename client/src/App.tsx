import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';

const HomePage = lazy(() => import('@/pages/HomePage'));
const PlanTripPage = lazy(() => import('@/pages/PlanTripPage'));
const SavedTripsPage = lazy(() => import('@/pages/SavedTripsPage'));
const TripDetailsPage = lazy(() => import('@/pages/TripDetailsPage'));
const TripHistoryPage = lazy(() => import('@/pages/TripHistoryPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="plan" element={<PlanTripPage />} />
            <Route path="saved-trips" element={<SavedTripsPage />} />
            <Route path="trips/:tripId" element={<TripDetailsPage />} />
            <Route path="history" element={<TripHistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
