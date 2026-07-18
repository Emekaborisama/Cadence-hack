import { Link, Navigate, Route, Routes } from 'react-router-dom';
import PatientPage from './pages/PatientPage.js';
import ClinicPage from './pages/ClinicPage.js';

// Launcher linking the two demo surfaces, in the clinician paper palette.
function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-strong">
        eMed × OpenAI · Reimagine Health
      </p>
      <h1 className="mt-4 font-serif text-6xl font-medium tracking-tight text-ink md:text-7xl">
        Cadence
      </h1>
      <p className="mt-5 max-w-xl text-center text-lg leading-relaxed text-muted">
        The consultation used to end at the door. Now it doesn&rsquo;t end at all — captured
        live, handed off visually, kept alive at home.
      </p>
      <div className="mt-10 grid w-full max-w-2xl gap-4 md:grid-cols-2">
        <Link
          to="/clinic"
          className="rounded-2xl border border-line bg-white p-6 text-left shadow-[0_12px_40px_-28px_rgba(26,28,25,0.5)] transition hover:border-mint"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Desktop
          </div>
          <div className="mt-1 font-serif text-2xl text-ink">Clinician view</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Live consult transcript, the plan assembling itself, approve &amp; send, and the
            between-visit inbox.
          </p>
        </Link>
        <Link
          to="/patient"
          className="rounded-2xl border border-line bg-white p-6 text-left shadow-[0_12px_40px_-28px_rgba(26,28,25,0.5)] transition hover:border-mint"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Mobile
          </div>
          <div className="mt-1 font-serif text-2xl text-ink">Patient view</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The plan lands seconds after the consult — medicines with the clinician&rsquo;s
            &ldquo;why&rdquo;, check-ins, and glucose tracking.
          </p>
        </Link>
      </div>
      <p className="mt-10 max-w-lg text-center text-sm text-muted">
        Demo: start the consult on the clinic screen, approve &amp; send, then watch the phone —
        and close the loop with a nausea check-in.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/patient" element={<PatientPage />} />
      <Route path="/clinic" element={<ClinicPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
