import jobsData from "@/data/jobs.json";
import { Job, JobBrowser } from "./job-browser";

export default function Home() {
  const jobs = jobsData.jobs as Job[];

  return (
    <div className="min-h-screen bg-zinc-100/60 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:gap-6 sm:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
            Agentic Job Scout
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Handpicked marketing, content and creative opportunities for Marwen Slimen
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Fresh on-site roles with visa sponsorship potential across the United Kingdom, Netherlands, Belgium, Ireland and Italy.
            Filter by country, keyword or visa details to focus your outreach, and click through for direct application links.
          </p>
        </header>

        <JobBrowser jobs={jobs} />
      </main>
    </div>
  );
}
