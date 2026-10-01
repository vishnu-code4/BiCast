import { Link } from 'react-router-dom';
import { Bike, CloudRain, MapPin, Shield, Zap, ChevronRight, Wind, Thermometer } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full
                        bg-brand-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full
                        bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <div className="text-center max-w-4xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                            bg-brand-500/10 border border-brand-500/20 mb-8 animate-slide-up">
              <Zap size={14} className="text-brand-400" />
              <span className="text-sm font-medium text-brand-400">
                Time-accurate weather at every checkpoint
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight
                           text-white mb-6 animate-slide-up">
              Ride smarter with
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-orange-300 bg-clip-text text-transparent">
                weather intelligence
              </span>
            </h1>

            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up">
              BiCAST doesn't just show today's weather — it calculates exactly what conditions
              you'll face at{' '}
              <span className="text-white/90 font-medium">every point of your journey</span>,
              based on when you'll actually be there.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                to="/plan"
                id="hero-plan-ride-btn"
                className="btn-primary text-base px-8 py-4 flex items-center gap-2 justify-center"
              >
                <Bike size={20} />
                Plan Your Ride
                <ChevronRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary text-base px-8 py-4 flex items-center gap-2 justify-center"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Routes Analysed', value: 'Real-time', icon: <MapPin size={20} /> },
              { label: 'Weather Sources', value: 'Open-Meteo', icon: <CloudRain size={20} /> },
              { label: 'Checkpoints', value: 'Dynamic', icon: <Zap size={20} /> },
              { label: 'Risk Assessment', value: 'AI-powered', icon: <Shield size={20} /> },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                <div className="text-brand-500">{stat.icon}</div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <p className="section-label mb-3">How BiCAST Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Weather at the right place, at the right time
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: <MapPin size={24} className="text-brand-400" />,
              title: 'Enter your journey',
              desc: 'Set your start point, destination, and departure date/time. BiCAST supports multiple route alternatives.',
              color: 'from-brand-500/20 to-orange-500/5',
            },
            {
              step: '02',
              icon: <Zap size={24} className="text-blue-400" />,
              title: 'Checkpoints are calculated',
              desc: 'BiCAST divides your route into time-based checkpoints and calculates when you\'ll reach each one.',
              color: 'from-blue-500/20 to-blue-500/5',
            },
            {
              step: '03',
              icon: <CloudRain size={24} className="text-purple-400" />,
              title: 'Weather meets your timeline',
              desc: 'Forecasts are pulled for each checkpoint\'s specific location AND estimated arrival time — not just the destination.',
              color: 'from-purple-500/20 to-purple-500/5',
            },
          ].map((card) => (
            <div
              key={card.step}
              className={`glass rounded-2xl p-8 bg-gradient-to-br ${card.color}
                          hover:border-white/20 transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="text-5xl font-black text-white/5 mb-4 leading-none">{card.step}</div>
              <div className="mb-4">{card.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-3">{card.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 bg-surface-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything a rider needs
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Wind size={20} />,
                title: 'Wind & Rain Alerts',
                desc: 'Proactive warnings for dangerous wind speeds, heavy rain, and poor visibility.',
              },
              {
                icon: <Thermometer size={20} />,
                title: 'Feels-like Temperature',
                desc: 'Accounts for wind chill and humidity to give you the actual riding experience.',
              },
              {
                icon: <Shield size={20} />,
                title: 'Riding Risk Score',
                desc: 'Each route segment gets a risk score so you can choose the safest option.',
              },
              {
                icon: <MapPin size={20} />,
                title: 'Useful Places Nearby',
                desc: 'Fuel stations, hospitals, and mechanics along your route — fetched from OpenStreetMap.',
              },
              {
                icon: <Bike size={20} />,
                title: 'Multiple Route Alternatives',
                desc: 'Compare up to 3 route options with full weather analysis for each.',
              },
              {
                icon: <CloudRain size={20} />,
                title: 'Trip History',
                desc: 'Save planned trips and review past journeys and their weather conditions.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 hover:border-white/20 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center
                                text-brand-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="glass rounded-3xl p-6 sm:p-12 text-center bg-gradient-to-br from-brand-500/10 to-surface-800/50">
          <Bike size={48} className="text-brand-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready for your next ride?
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Enter your route and departure time — BiCAST will do the rest.
          </p>
          <Link
            to="/plan"
            id="footer-plan-ride-btn"
            className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2"
          >
            <Bike size={20} />
            Plan Your Ride
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
