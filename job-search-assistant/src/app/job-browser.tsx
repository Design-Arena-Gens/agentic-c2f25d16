"use client";

import { useMemo, useState } from "react";

type VisaStatus = "Yes" | "No" | "Not mentioned";

export interface Job {
  id: string;
  title: string;
  company: string;
  applyUrl: string;
  location: string;
  country: string;
  posted: string;
  visa: { status: VisaStatus };
  matchReasons: string[];
  source: string;
}

interface JobBrowserProps {
  jobs: Job[];
}

const matchesQuery = (job: Job, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    job.title.toLowerCase().includes(normalized) ||
    job.company.toLowerCase().includes(normalized) ||
    job.location.toLowerCase().includes(normalized) ||
    job.matchReasons.some((reason) => reason.toLowerCase().includes(normalized))
  );
};

export function JobBrowser({ jobs }: JobBrowserProps) {
  const [country, setCountry] = useState<string>("All");
  const [visa, setVisa] = useState<VisaStatus | "All">("All");
  const [search, setSearch] = useState<string>("");

  const countries = useMemo(() => {
    return ["All", ...Array.from(new Set(jobs.map((job) => job.country))).sort()];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const byCountry = country === "All" || job.country === country;
      const byVisa = visa === "All" || job.visa.status === visa;
      const bySearch = matchesQuery(job, search);
      return byCountry && byVisa && bySearch;
    });
  }, [jobs, country, visa, search]);

  const jobsPerCountry = useMemo(() => {
    return filteredJobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.country] = (acc[job.country] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredJobs]);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="country" className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-zinc-400 focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500"
          >
            {countries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="visa" className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Visa sponsorship
          </label>
          <select
            id="visa"
            value={visa}
            onChange={(event) => setVisa(event.target.value as VisaStatus | "All")}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-zinc-400 focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500"
          >
            <option value="All">All</option>
            <option value="Yes">Visa sponsorship mentioned</option>
            <option value="No">No sponsorship</option>
            <option value="Not mentioned">Not mentioned</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-1">
          <label htmlFor="search" className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Search keywords
          </label>
          <input
            id="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Try "content", "video", "SEO"...'
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-zinc-400 focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-5">
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Snapshot
          </h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {filteredJobs.length} role{filteredJobs.length === 1 ? "" : "s"} match your filters
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Highlighting fresh roles across campaign management, content, social and creative in your target markets.
          </p>
        </div>
        <div className="md:col-span-3">
          <ul className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-200 sm:grid-cols-2">
            {Object.entries(jobsPerCountry).map(([countryName, count]) => (
              <li
                key={countryName}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span className="font-medium">{countryName}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {filteredJobs.map((job) => (
          <article
            key={job.id}
            className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-black/10 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
          >
            <header className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{job.posted}</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {job.country}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h3>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {job.company} · {job.location}
              </p>
            </header>

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Why it fits</h4>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
                {job.matchReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                Source: {job.source}
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                Visa: {job.visa.status}
              </span>
            </div>

            <footer className="mt-auto flex items-center gap-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Apply now
              </a>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Opens in new tab</span>
            </footer>
          </article>
        ))}

        {filteredJobs.length === 0 && (
          <p className="rounded-3xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No roles match your filters yet. Try widening your search or resetting the filters.
          </p>
        )}
      </section>
    </div>
  );
}
