import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="text-8xl font-black text-white/5 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-white/50 mb-8">
          The route you're looking for doesn't exist.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home size={16} />
            Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
