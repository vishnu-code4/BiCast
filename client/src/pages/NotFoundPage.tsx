import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="page-container min-h-[70vh] flex items-center justify-center animate-fade-in">
      <div className="bento-tile max-w-md w-full text-center p-8 sm:p-10 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-white/5 mb-3 tracking-wider">
            404
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Off the Beaten Path</h1>
          <p className="text-sm text-white/50 mb-8 max-w-xs mx-auto">
            The waypoint or route you are searching for does not exist or has moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link to="/" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-sm">
              <Home size={16} />
              Return Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
