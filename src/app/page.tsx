import Link from "next/link";

const benefits = [
  {
    number: "01",
    title: "Scheduling that respects clinic rules",
    description:
      "Appointment requests are checked against active doctors, weekly availability, slot rules, and Africa/Cairo local time.",
    label: "Clinic-aware scheduling",
  },
  {
    number: "02",
    title: "Patient information handled with care",
    description:
      "The booking service uses a restricted database role and returns only the safe appointment details needed by the caller.",
    label: "Privacy-minded by design",
  },
  {
    number: "03",
    title: "More dependable booking logic",
    description:
      "Bookings are created atomically, with database safeguards that prevent overlapping active appointments from being accepted.",
    label: "Conflict-safe workflow",
  },
];

const workflow = [
  {
    number: "01",
    title: "A request is submitted",
    description:
      "A clinic booking experience sends the selected doctor, contact details, and requested appointment time.",
  },
  {
    number: "02",
    title: "Clinic rules are checked",
    description:
      "The service validates the doctor, weekly schedule, time slot, and Cairo-local appointment time.",
  },
  {
    number: "03",
    title: "A safe result is returned",
    description:
      "The database creates the booking as one operation and reports a conflict if that time is no longer available.",
  },
];

function ClinicSyncMark() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#087e72] text-white shadow-lg shadow-teal-900/10">
      <svg
        aria-hidden="true"
        className="size-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 transition-transform group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen overflow-hidden bg-[#f5f9f7] text-[#16332f] selection:bg-teal-100 selection:text-teal-950"
      id="top"
    >
      <a
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-teal-900 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="relative z-10 border-b border-[#dfeae6]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link
            aria-label="ClinicSync home"
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
            href="#top"
          >
            <ClinicSyncMark />
            <span className="text-xl font-bold tracking-tight text-[#16332f]">
              Clinic<span className="text-[#087e72]">Sync</span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm font-medium text-[#526a65] md:flex"
          >
            <Link className="transition-colors hover:text-[#087e72]" href="#benefits">
              Why ClinicSync
            </Link>
            <Link className="transition-colors hover:text-[#087e72]" href="#how-it-works">
              How it works
            </Link>
          </nav>

          <Link
            className="group inline-flex items-center gap-2 rounded-full bg-[#16332f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#087e72] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 sm:px-5"
            href="#how-it-works"
          >
            <span className="hidden sm:inline">Explore the workflow</span>
            <span className="sm:hidden">Explore</span>
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section
          aria-labelledby="hero-title"
          className="relative isolate"
          id="home"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-36 -top-28 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(27,155,132,0.13)_0%,rgba(27,155,132,0)_68%)]"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d5e8e2] bg-white/75 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#32746a] shadow-sm shadow-teal-950/[0.03]">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-[#15947f]"
                />
                Appointment coordination for clinics
              </div>
              <h1
                className="max-w-[13ch] text-5xl leading-[1.04] font-semibold tracking-[-0.055em] text-[#16332f] sm:text-6xl lg:text-7xl"
                id="hero-title"
              >
                Care runs better when schedules do.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#58706b] sm:text-xl sm:leading-9">
                ClinicSync helps medical clinics coordinate appointment requests
                with scheduling rules built around the way care teams work.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#087e72] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/10 transition hover:-translate-y-0.5 hover:bg-[#066a60] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                  href="#how-it-works"
                >
                  See how ClinicSync works
                  <ArrowIcon />
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#cbded8] bg-white/70 px-6 py-3 text-sm font-semibold text-[#315b54] transition hover:border-[#90b8ac] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                  href="#benefits"
                >
                  Explore the benefits
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-[#6a807a]">
                <svg
                  aria-hidden="true"
                  className="size-4 text-[#087e72]"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="m5 10.25 3.25 3.25L15 6.75"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                Designed for clinic teams and the people they care for
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[#dff0e9] via-[#eff7f3] to-[#e7eef5] blur-xl"
              />
              <div className="rounded-[2rem] border border-white/90 bg-white/90 p-5 shadow-[0_28px_90px_-42px_rgba(18,74,63,0.36)] backdrop-blur sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#548179]">
                      The ClinicSync approach
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#173d36]">
                      A thoughtful booking workflow
                    </h2>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e6f4ef] text-[#087e72]">
                    <svg
                      aria-hidden="true"
                      className="size-6"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M7 3.75v3M17 3.75v3M4.75 9h14.5M6.5 5.25h11A1.75 1.75 0 0 1 19.25 7v12A1.75 1.75 0 0 1 17.5 20.75h-11A1.75 1.75 0 0 1 4.75 19V7A1.75 1.75 0 0 1 6.5 5.25Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                      <path
                        d="m9 14 2 2 4-4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                </div>

                <div className="mt-7 space-y-3">
                  {workflow.map((step) => (
                    <div
                      className="flex items-center gap-4 rounded-2xl border border-[#e5eeea] bg-[#fbfdfc] p-4"
                      key={step.number}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f4ef] text-xs font-bold tracking-wide text-[#087e72]">
                        {step.number}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#23453f]">
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#71847f]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f1f7f4] px-4 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#087e72] shadow-sm">
                    <svg
                      aria-hidden="true"
                      className="size-4"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 2.5 3.75 5v4.25c0 3.7 2.55 6.55 6.25 8.25 3.7-1.7 6.25-4.55 6.25-8.25V5L10 2.5Z"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="m7.5 9.75 1.7 1.7 3.3-3.45"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </span>
                  <p className="text-sm leading-6 text-[#55716a]">
                    Secure, schedule-aware logic at the heart of every request.
                  </p>
                </div>
              </div>
              <p className="mt-4 px-2 text-center text-xs leading-5 text-[#71847f]">
                Product overview only — no live availability or patient
                information is shown here.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="benefits-title"
          className="border-y border-[#e2ece7] bg-white/65"
          id="benefits"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#428076]">
                Made for the work behind great care
              </p>
              <h2
                className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#16332f] sm:text-4xl"
                id="benefits-title"
              >
                Less friction in the details. More focus on people.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#607772] sm:text-lg">
                ClinicSync brings thoughtful scheduling rules and careful data
                handling to the appointment workflow.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article
                  className="rounded-3xl border border-[#e1ece7] bg-white p-6 shadow-sm shadow-[#153b33]/[0.03] sm:p-7"
                  key={benefit.number}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[#eaf5f0] text-sm font-bold text-[#087e72]">
                      {benefit.number}
                    </span>
                    <span className="rounded-full bg-[#f2f8f5] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#548179]">
                      {benefit.label}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#1e403a]">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#687e78] sm:text-base">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="how-title"
          className="relative"
          id="how-it-works"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#428076]">
                  How it works
                </p>
                <h2
                  className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.035em] text-[#16332f] sm:text-4xl"
                  id="how-title"
                >
                  A clear path from request to result.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#607772] sm:text-lg">
                  ClinicSync keeps the booking logic focused: validate the
                  request, respect the clinic schedule, and handle conflicts
                  safely.
                </p>
                <Link
                  className="group mt-7 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#087e72] underline decoration-[#b8d9ce] decoration-2 underline-offset-4 transition hover:text-[#075f56] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                  href="#top"
                >
                  Back to the top
                  <ArrowIcon />
                </Link>
              </div>

              <div className="space-y-3">
                {workflow.map((step) => (
                  <article
                    className="grid gap-4 rounded-3xl border border-[#dfeae6] bg-white/75 p-5 sm:grid-cols-[3.5rem_1fr] sm:gap-5 sm:p-6"
                    key={step.number}
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#e8f4ef] text-sm font-bold text-[#087e72]">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1e403a]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#687e78] sm:text-base">
                        {step.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dfeae6] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link
            aria-label="ClinicSync home"
            className="flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
            href="#top"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-[#087e72] text-white">
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.4"
                />
              </svg>
            </span>
            <span className="font-bold tracking-tight text-[#23453f]">
              ClinicSync
            </span>
          </Link>
          <p className="text-sm text-[#71847f]">
            Appointment coordination for medical clinics.
          </p>
        </div>
      </footer>
    </div>
  );
}
