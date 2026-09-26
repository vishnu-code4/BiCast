import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import PlanTripPage from '@/pages/PlanTripPage';
import SavedTripsPage from '@/pages/SavedTripsPage';
import TripDetailsPage from '@/pages/TripDetailsPage';
import TripHistoryPage from '@/pages/TripHistoryPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
