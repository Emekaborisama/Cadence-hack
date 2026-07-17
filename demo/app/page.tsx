import Link from "next/link";

export default function Home() {
  return (
    <main className="app-canvas min-h-full flex-1">
      <div className="mx-auto flex max-w-3xl flex-col justify-center gap-10 px-6 py-16">
        <header className="space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-care">
            eMed × OpenAI · Reimagine Health
          </p>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-ink">
            Cadence
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Trial-grade cardiometabolic support, delivered by AI. Open the two
            surfaces in separate windows and run the demo side by side.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/clinic"
            className="group rounded-2xl border border-line bg-white/70 p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
              Desktop
            </div>
            <div className="mt-1 font-serif text-xl font-medium text-ink">
              Clinician view
            </div>
            <p className="mt-2 text-sm text-muted">
              Live consult transcript, a care plan that assembles itself, edit
              and approve, and the between-visit inbox.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-care-strong group-hover:underline">
              Open /clinic →
            </span>
          </Link>

          <Link
            href="/patient"
            className="group rounded-2xl glass p-6 transition hover:shadow-md"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
              Mobile
            </div>
            <div className="mt-1 font-serif text-xl font-medium text-ink">
              Patient view
            </div>
            <p className="mt-2 text-sm text-muted">
              Meera&apos;s companion: the plan arrives, a daily rhythm keeps her
              on track, and her readings close the loop.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-care-strong group-hover:underline">
              Open /patient →
            </span>
          </Link>
        </div>

        <p className="text-sm text-muted">
          Demo choreography: reset → start the consult on /clinic → edit a dose →
          approve &amp; send → tap the Week 2 check-in on /patient → watch the
          clinic inbox light up.
        </p>
      </div>
    </main>
  );
}
