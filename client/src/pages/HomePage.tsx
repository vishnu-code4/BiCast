// ============================================================
// BiCAST Home Landing Page
// Asymmetric Bento Grid Design with Live Ride Telemetry Showcase
// ============================================================
import { Link } from 'react-router-dom';
import {
  Bike,
  CloudRain,
  MapPin,
  Shield,
  Zap,
  ChevronRight,
  Wind,
  Thermometer,
  ShieldCheck,
  Fuel,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="animate-fade-in space-y-12 sm:space-y-16 pb-16">
      {/* ============================================================
          1. Hero Section: 12-Column Split with Telemetry Bento Card
          ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-20">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-brand-500/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div className="page-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column (7 cols): Headline, Badge, Description & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 animate-slide-up shadow-sm">
                <Zap size={14} className="text-brand-400" />
                <span className="text-xs sm:text-sm font-semibold text-brand-400">
                  Time-accurate weather at every 15–30 min checkpoint
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] animate-slide-up">
                Ride smarter with
                <br />
                <span className="bg-gradient-to-r from-brand-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                  weather intelligence
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-slide-up">
                BiCAST calculates conditions along your route based on when you’ll actually arrive at each checkpoint — with multi-stop routes, fuel planning, and safety scoring.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start pt-2 animate-slide-up">
                <Link
                  to="/plan"
                  id="hero-plan-ride-btn"
                  className="btn-primary text-sm sm:text-base px-7 py-3.5 flex items-center gap-2.5 justify-center shadow-bento hover:shadow-bento-hover"
                >
                  <Bike size={20} />
                  <span>Plan Your Ride</span>
                  <ChevronRight size={18} />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-secondary text-sm sm:text-base px-7 py-3.5 flex items-center gap-2 justify-center shadow-sm"
                >
                  How it works
                </a>
              </div>

              {/* Rider Trust Pills */}
              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs text-white/40 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  0–100 Safety Risk Engine
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Fuel size={15} className="text-amber-400" />
                  Motorcycle Fuel Telemetry
                </span>
              </div>
            </div>

            {/* Right Column (5 cols): Live Ride Telemetry Preview Bento Card */}
            <div className="lg:col-span-5">
              <div className="bento-tile border-white/15 shadow-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden backdrop-blur-2xl">
                {/* Glow backdrop inside card */}
                <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />

                {/* Header: Sample Route + Live Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400">
                      Active Route Telemetry
                    </span>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                      <span>Bangalore</span>
                      <span className="text-white/40">&rarr;</span>
                      <span>Munnar</span>
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span>🛡️</span>
                    <span>92/100 Low Risk</span>
                  </span>
                </div>

                {/* 3 Sample Checkpoint Weather Pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                    Checkpoint Weather Forecast (15–30 min intervals)
                  </span>

                  {/* CP 1 */}
                  <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-white">Electronic City (0 km)</p>
                        <p className="text-[10px] text-white/40">Clear Sky &bull; Wind 12 km/h</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold">06:30</span>
                      <span className="text-white text-xs font-bold block">21°C</span>
                    </div>
                  </div>

                  {/* CP 2 */}
                  <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-white">Hosur Bypass (42 km)</p>
                        <p className="text-[10px] text-white/40">Partly Cloudy &bull; 0% Rain</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold">08:00</span>
                      <span className="text-white text-xs font-bold block">24°C</span>
                    </div>
                  </div>

                  {/* CP 3 */}
                  <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <p className="font-semibold text-white">Krishnagiri Ghats (94 km)</p>
                        <p className="text-[10px] text-white/40">Mist & Light Breeze</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold">09:30</span>
                      <span className="text-white text-xs font-bold block">22°C</span>
                    </div>
                  </div>
                </div>

                {/* Fuel Status Bar */}
                <div className="bento-subtile p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5 font-medium">
                      <Fuel size={13} className="text-amber-400" />
                      <span>Estimated Fuel</span>
                    </span>
                    <span className="text-amber-300 font-bold">11.8 L &bull; ₹1,215</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[82%]" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-0.5">
                    <span>Safe Range: 380 km</span>
                    <span>Refuelling Stop at 310 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. Stats Bar Section (.page-container)
          ============================================================ */}
      <section className="border-y border-white/5 bg-surface-800/40">
        <div className="page-container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Routes Analysed', value: 'Real-time', icon: <MapPin size={20} /> },
              { label: 'Weather Sources', value: 'Open-Meteo', icon: <CloudRain size={20} /> },
              { label: 'Checkpoints', value: '15–30 Min', icon: <Zap size={20} /> },
              { label: 'Risk Assessment', value: 'Deterministic', icon: <Shield size={20} /> },
            ].map((stat) => (
              <div key={stat.label} className="bento-subtile p-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="text-brand-400">{stat.icon}</div>
                <div className="text-xl font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          3. How BiCAST Works (3-Step Connected Bento Row)
          ============================================================ */}
      <section id="how-it-works" className="page-container py-12 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <p className="section-label mb-2">How BiCAST Works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Weather at the right place, at the right time
          </h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto mt-2">
            Traditional weather apps give destination forecasts. BiCAST forecasts every leg of your route according to when you will reach it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: 'STEP 01',
              icon: <MapPin size={24} className="text-brand-400" />,
              title: 'Enter your journey',
              desc: 'Set your start point, destination, and departure date/time. BiCAST computes multiple route options with intermediate stops.',
              accentClass: 'border-brand-500/30',
            },
            {
              step: 'STEP 02',
              icon: <Zap size={24} className="text-cyan-400" />,
              title: 'Checkpoints are calculated',
              desc: 'BiCAST divides your entire route into 15–30 min travel intervals and accurately projects your arrival time at each one.',
              accentClass: 'border-cyan-500/30',
            },
            {
              step: 'STEP 03',
              icon: <CloudRain size={24} className="text-purple-400" />,
              title: 'Weather meets your timeline',
              desc: 'High-resolution forecasts are queried for each checkpoint at your estimated arrival hour — eliminating surprises.',
              accentClass: 'border-purple-500/30',
            },
          ].map((card) => (
            <div
              key={card.step}
              className={`bento-tile-interactive p-7 flex flex-col justify-between space-y-4 border ${card.accentClass}`}
            >
              <div>
                <span className="text-xs font-black tracking-widest text-brand-400 uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {card.step}
                </span>
                <div className="mt-5 mb-4">{card.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          4. Features Asymmetric Bento Grid
          ============================================================ */}
      <section className="page-container py-12 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <p className="section-label mb-2">Features</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Engineered for motorcycle touring
          </h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto mt-2">
            Purpose-built telemetry, risk evaluation, and route analytics tailored specifically for riders.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Tile 1: Riding Risk Score (0-100 Deterministic Engine) - Wide Featured Tile (lg:col-span-7) */}
          <div className="md:col-span-6 lg:col-span-7 bento-tile-interactive p-6 sm:p-7 flex flex-col justify-between space-y-5">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4">
                <Shield size={22} />
              </div>
              <h3 className="text-xl font-bold text-white">Riding Risk Score (0–100 Deterministic Engine)</h3>
              <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
                Every route and checkpoint is continuously evaluated against transparent, rule-based deductions. Penalties are assessed for heavy rain, wind gusts, reduced road visibility, thunderstorm activity, and temperature extremes.
              </p>
            </div>

            {/* Visual Risk Tier Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">80–100</span>
                <span className="text-xs font-semibold text-emerald-300">Green Tier</span>
                <span className="text-[9px] text-white/40 block mt-0.5">Optimal conditions</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase block">60–79</span>
                <span className="text-xs font-semibold text-amber-300">Yellow Tier</span>
                <span className="text-[9px] text-white/40 block mt-0.5">Moderate caution</span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-center">
                <span className="text-[10px] font-bold text-orange-400 uppercase block">40–59</span>
                <span className="text-xs font-semibold text-orange-300">Orange Tier</span>
                <span className="text-[9px] text-white/40 block mt-0.5">High hazard alert</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center">
                <span className="text-[10px] font-bold text-rose-400 uppercase block">&lt;40</span>
                <span className="text-xs font-semibold text-rose-300">Red Tier</span>
                <span className="text-[9px] text-white/40 block mt-0.5">Severe conditions</span>
              </div>
            </div>
          </div>

          {/* Tile 2: Wind & Rain Alerts - Highlighted Alert Tile (lg:col-span-5) */}
          <div className="md:col-span-3 lg:col-span-5 bento-tile-interactive p-6 sm:p-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <Wind size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Wind & Rain Alerts</h3>
              <p className="text-xs sm:text-sm text-white/50 mt-1.5 leading-relaxed">
                Proactive warnings for crosswinds exceeding safe motorcycle stability thresholds, torrential rain pockets, and mountain pass fog.
              </p>
            </div>

            {/* Alert Chip Preview */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-xs">High Crosswind Alert</p>
                <p className="text-[11px] text-rose-200/80 mt-0.5">
                  Gusts up to 48 km/h detected near ghat section. Maintain conservative lean angles.
                </p>
              </div>
            </div>
          </div>

          {/* Tile 3: Feels-like Temperature - Compact Telemetry (lg:col-span-4) */}
          <div className="md:col-span-3 lg:col-span-4 bento-tile-interactive p-6 flex flex-col justify-between space-y-3">
            <div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4">
                <Thermometer size={22} />
              </div>
              <h3 className="text-base font-bold text-white">Feels-like Temperature</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Accounts for wind chill at 80+ km/h cruising speeds and tropical humidity to project true rider thermal comfort along highway legs.
              </p>
            </div>
            <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-white/60">Highway Speed Chill:</span>
              <span className="font-bold text-cyan-300">-4°C adjusted</span>
            </div>
          </div>

          {/* Tile 4: Useful Places & Fuel Stops Nearby - Corridor Sampling (lg:col-span-4) */}
          <div className="md:col-span-3 lg:col-span-4 bento-tile-interactive p-6 flex flex-col justify-between space-y-3">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Fuel size={22} />
              </div>
              <h3 className="text-base font-bold text-white">Useful Places & Fuel Stops</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Samples OpenStreetMap corridors for reachable petrol stations before your tank hits reserve, plus puncture mechanics, cafes, and hospitals.
              </p>
            </div>
            <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-white/60">Corridor Buffer:</span>
              <span className="font-bold text-amber-300">Up to 3km detour</span>
            </div>
          </div>

          {/* Tile 5: Multiple Route Alternatives & Trip History (lg:col-span-4) */}
          <div className="md:col-span-3 lg:col-span-4 bento-tile-interactive p-6 flex flex-col justify-between space-y-3">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <Compass size={22} />
              </div>
              <h3 className="text-base font-bold text-white">Route Alternatives & Logbook</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Compare up to 3 routes side-by-side on Leaflet with full weather timelines, save custom multi-stop rides, and track lifetime statistics.
              </p>
            </div>
            <div className="bento-subtile p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-white/60">Alternatives Engine:</span>
              <span className="font-bold text-emerald-400">Safest vs Fastest</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          5. CTA Footer Section
          ============================================================ */}
      <section className="page-container">
        <div className="bento-tile p-8 sm:p-14 text-center relative overflow-hidden bg-gradient-to-br from-brand-500/15 via-surface-800 to-surface-900 border border-brand-500/30 shadow-bento">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6 text-brand-400 shadow-glow-orange">
            <Bike size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Ready for your next journey?
          </h2>
          <p className="text-white/60 text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">
            Specify your origin, destination, and departure time — BiCAST takes care of the weather checkpoints, fuel telemetry, and safety risks.
          </p>
          <Link
            to="/plan"
            id="footer-plan-ride-btn"
            className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2 shadow-bento hover:shadow-bento-hover"
          >
            <Bike size={20} />
            <span>Plan Your Ride</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
