import fs from "node:fs";
import path from "node:path";

type VisaStatus = "Yes" | "No" | "Not mentioned";

interface SearchConfig {
  country: string;
  locationParam: string;
  keywords: string;
  label: string;
  maxJobs: number;
}

interface RawJob {
  title: string;
  company: string;
  jobUrl: string;
  companyUrl?: string;
  locationLine: string;
  postedText?: string;
  metaTags: string[];
  countryGuess: string;
  search: SearchConfig;
}

interface JobEntry {
  id: string;
  title: string;
  company: string;
  applyUrl: string;
  companyUrl?: string;
  location: string;
  country: string;
  posted: string;
  meta: string[];
  matchReasons: string[];
  visa: {
    status: VisaStatus;
    evidence?: string;
  };
  searchLabel: string;
  searchKeywords: string;
  source: string;
  fetchedAt: string;
}

const SEARCHES: SearchConfig[] = [
  {
    country: "Belgium",
    locationParam: "Belgium",
    keywords: "digital marketing",
    label: "Digital Marketing (Belgium)",
    maxJobs: 4,
  },
  {
    country: "Belgium",
    locationParam: "Brussels, Brussels Region, Belgium",
    keywords: "social media manager",
    label: "Social Media Manager (Belgium)",
    maxJobs: 4,
  },
  {
    country: "Ireland",
    locationParam: "Dublin, County Dublin, Ireland",
    keywords: "digital marketing manager",
    label: "Digital Marketing Manager (Ireland)",
    maxJobs: 4,
  },
  {
    country: "Ireland",
    locationParam: "Dublin, County Dublin, Ireland",
    keywords: "social media specialist",
    label: "Social Media Specialist (Ireland)",
    maxJobs: 4,
  },
  {
    country: "Italy",
    locationParam: "Milan, Lombardy, Italy",
    keywords: "digital marketing",
    label: "Digital Marketing (Italy)",
    maxJobs: 5,
  },
  {
    country: "Italy",
    locationParam: "Rome, Lazio, Italy",
    keywords: "content creator",
    label: "Content Creator (Italy)",
    maxJobs: 5,
  },
  {
    country: "Netherlands",
    locationParam: "Netherlands",
    keywords: "digital marketing",
    label: "Digital Marketing (Netherlands)",
    maxJobs: 6,
  },
  {
    country: "Netherlands",
    locationParam: "Amsterdam, North Holland, Netherlands",
    keywords: "content marketer",
    label: "Content Marketer (Netherlands)",
    maxJobs: 4,
  },
  {
    country: "United Kingdom",
    locationParam: "United Kingdom",
    keywords: "digital marketing executive",
    label: "Digital Marketing Executive (UK)",
    maxJobs: 6,
  },
  {
    country: "United Kingdom",
    locationParam: "United Kingdom",
    keywords: "content creator social media",
    label: "Content Creator / Social Media (UK)",
    maxJobs: 5,
  }
];

const MAX_START = 50;
const JOBS: Map<string, JobEntry> = new Map();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url: string, attempt = 1): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "text/plain, text/markdown, */*",
    },
  });
  if (response.status === 429) {
    if (attempt > 4) {
      throw new Error(`Exceeded retry attempts for ${url}`);
    }
    const waitMs = 3000 * attempt;
    console.warn(`429 for ${url} – retrying in ${waitMs}ms (attempt ${attempt})`);
    await delay(waitMs);
    return fetchText(url, attempt + 1);
  }
  const payload = await response.text();
  if (response.status === 429 || /HTTP ERROR 429/i.test(payload) || /Too Many Requests/i.test(payload)) {
    if (attempt > 4) {
      throw new Error(`Exceeded retry attempts for ${url}`);
    }
    const waitMs = 4000 * attempt;
    console.warn(`429 content for ${url} – retrying in ${waitMs}ms (attempt ${attempt})`);
    await delay(waitMs);
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return payload;
}

function parseMarkdown(markdown: string, search: SearchConfig): RawJob[] {
  const cleaned = markdown.split("Markdown Content:").pop();
  if (!cleaned) return [];

  const blocks = cleaned
    .split("\n*   ")
    .map((block, index) => (index === 0 ? block.trim() : `*   ${block.trim()}`))
    .filter((block) => block.startsWith("*"));

  const results: RawJob[] = [];

  for (const block of blocks) {
    const titleMatch = block.match(/\*   \[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
    if (!titleMatch) continue;

    const jobUrl = titleMatch[2];
    if (!jobUrl.includes("linkedin.com/jobs/view")) continue;

    const companyMatch = block.match(/#### \[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
    if (!companyMatch) continue;

    const metaMatch = block.match(/\n\n ([^\n]+)\n/);
    const rawMeta = metaMatch ? metaMatch[1].trim() : "";

    const metaParts = rawMeta
      .split("  ")
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const location = metaParts.shift() ?? search.country;
    const postedText =
      metaParts.find((item) => /\b(day|hour|week|month)s?\s+ago\b/i.test(item)) ??
      metaParts.find((item) => /\b(today|yesterday)\b/i.test(item)) ??
      "";

    results.push({
      title: titleMatch[1].trim(),
      company: companyMatch[1].trim(),
      jobUrl,
      companyUrl: companyMatch[2],
      locationLine: location,
      postedText,
      metaTags: metaParts,
      countryGuess: inferCountry(location) ?? search.country,
      search,
    });
  }

  return results;
}

function inferCountry(location: string): string | undefined {
  const lower = location.toLowerCase();
  const countries = [
    "united kingdom",
    "netherlands",
    "belgium",
    "ireland",
    "italy",
    "tunisia",
    "united states",
    "france",
    "germany",
  ];
  for (const country of countries) {
    if (lower.includes(country)) {
      return country
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }
  if (/, *([A-Za-z ]+)$/.test(location)) {
    return location
      .split(",")
      .pop()!
      .trim();
  }
  return undefined;
}

function isRemote(meta: string[], location: string): boolean {
  const text = `${location} ${meta.join(" ")}`.toLowerCase();
  return text.includes("remote") || text.includes("work from home");
}

function isRelevantTitle(title: string): boolean {
  const normalized = title.toLowerCase();
  const required = ["marketing", "content", "social", "video", "digital", "creative", "communications", "community", "seo", "brand"];
  const excluded = ["engineer", "engineering", "developer", "scientist", "medical writer", "nurse", "physician", "chemist"];
  if (!required.some((keyword) => normalized.includes(keyword))) {
    return false;
  }
  if (excluded.some((keyword) => normalized.includes(keyword))) {
    return false;
  }
  return true;
}

async function detectVisa(jobUrl: string): Promise<{ status: VisaStatus; evidence?: string; detailText: string }> {
  const proxyUrl = `https://r.jina.ai/${jobUrl}`;
  const text = await fetchText(proxyUrl);
  const body = text.split("Markdown Content:").pop() ?? text;
  const lower = body.toLowerCase();

  const positiveMatch = lower.match(/(visa (sponsorship|support|assistance|provided|relocation)|work permit support|sponsor your visa)/);
  if (positiveMatch) {
    const evidence = extractEvidence(body, positiveMatch[0]);
    return { status: "Yes", evidence, detailText: body };
  }

  const negativeMatch = lower.match(/(no visa sponsorship|without sponsorship|must have (?:eu )?work permit|not provide sponsorship)/);
  if (negativeMatch) {
    const evidence = extractEvidence(body, negativeMatch[0]);
    return { status: "No", evidence, detailText: body };
  }

  const permitMatch = lower.match(/(work permit|right to work)/);
  if (permitMatch) {
    const evidence = extractEvidence(body, permitMatch[0]);
    return { status: "Not mentioned", evidence, detailText: body };
  }

  return { status: "Not mentioned", detailText: body };
}

function extractEvidence(text: string, keyword: string): string | undefined {
  const clean = text.replace(/\s+/g, " ");
  const index = clean.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return undefined;

  const start = Math.max(0, index - 160);
  const end = Math.min(clean.length, index + 200);
  return clean.slice(start, end).trim();
}

function buildMatchReasons(raw: RawJob, detailText: string): string[] {
  const reasons = new Set<string>();
  reasons.add(`Matches ${raw.search.label}`);

  const corpus = `${raw.title} ${detailText}`.toLowerCase();

  const skillRules: Array<{ keywords: string[]; reason: string }> = [
    {
      keywords: ["social media", "social-media", "instagram", "tiktok", "facebook", "x (formerly twitter)", "community manager"],
      reason: "Direct social media and community management responsibilities",
    },
    {
      keywords: ["content creation", "content strategy", "copywriting", "storytelling", "blog", "newsletter"],
      reason: "High volume content creation and storytelling focus",
    },
    {
      keywords: ["video", "filming", "videography", "premiere pro", "after effects", "motion graphics"],
      reason: "Video production/editing skills explicitly requested",
    },
    {
      keywords: ["wordpress", "cms", "content management system"],
      reason: "WordPress / CMS publishing experience highlighted",
    },
    {
      keywords: ["seo", "search engine", "organic traffic", "keyword research"],
      reason: "SEO optimisation responsibilities included",
    },
    {
      keywords: ["campaign", "go-to-market", "marketing campaign", "campaign planning"],
      reason: "Owns campaign planning and execution",
    },
    {
      keywords: ["adobe", "photoshop", "illustrator", "lightroom", "graphic design"],
      reason: "Graphic design & Adobe Creative Suite skills required",
    },
    {
      keywords: ["video editing", "davinci resolve", "final cut"],
      reason: "Hands-on video editing deliverables",
    },
    {
      keywords: ["analytics", "google analytics", "reporting", "data driven"],
      reason: "Performance analytics & reporting responsibilities",
    },
  ];

  for (const rule of skillRules) {
    if (rule.keywords.some((kw) => corpus.includes(kw))) {
      reasons.add(rule.reason);
    }
  }

  return Array.from(reasons);
}

async function processSearch(search: SearchConfig) {
  console.log(`Fetching "${search.keywords}" in ${search.country}`);
  for (let start = 0; start <= MAX_START; start += 25) {
    const params = new URLSearchParams({
      keywords: search.keywords,
      location: search.locationParam,
      f_TPR: "r604800",
      f_WT: "2",
      start: start.toString(),
    });
    const url = `https://r.jina.ai/https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;

    let text: string;
    try {
      text = await fetchText(url);
    } catch (error) {
      console.warn(`Failed search fetch ${url}`, error);
      break;
    }

    if (!text.includes("Markdown Content:")) {
      break;
    }

    const parsed = parseMarkdown(text, search);
    if (!parsed.length) {
      if (search.country === "Belgium") {
        console.log(`  raw content snippet: ${text.slice(0, 120)}`);
      }
      console.log(`  no parsed results for ${search.keywords} in ${search.country} (start=${start})`);
      break;
    }

    for (const raw of parsed) {
      const canonicalUrl = raw.jobUrl.split("?")[0];
      if (raw.title.toLowerCase().includes("remote")) {
        if (search.country === "Belgium") console.log(`    skip remote title: ${raw.title}`);
        continue;
      }
      if (isRemote(raw.metaTags, raw.locationLine)) {
        if (search.country === "Belgium") console.log(`    skip remote meta: ${raw.title}`);
        continue;
      }
      if (!isRelevantTitle(raw.title)) {
        if (search.country === "Belgium") console.log(`    skip irrelevant: ${raw.title}`);
        continue;
      }
      if (raw.company.toLowerCase().includes("twine")) {
        if (search.country === "Belgium") console.log(`    skip company: ${raw.title}`);
        continue;
      }
      if (JOBS.has(canonicalUrl)) {
        if (search.country === "Belgium") console.log(`    skip duplicate: ${raw.title}`);
        continue;
      }
      if (!raw.countryGuess.toLowerCase().includes(search.country.toLowerCase())) {
        if (search.country === "Belgium") console.log(`    skip wrong country: ${raw.title} => ${raw.countryGuess}`);
        continue;
      }
      if (JOBS.size >= 200) break;

      console.log(`  • ${raw.title} @ ${raw.company} (${raw.locationLine})`);
      await delay(800);

      let visaInfo;
      try {
        visaInfo = await detectVisa(raw.jobUrl);
      } catch (error) {
        console.warn(`    visa check failed for ${raw.jobUrl}`, error);
        visaInfo = { status: "Not mentioned" as VisaStatus, detailText: "" };
      }

      const reasons = buildMatchReasons(raw, visaInfo.detailText);

      const entry: JobEntry = {
        id: canonicalUrl,
        title: raw.title,
        company: raw.company,
        applyUrl: canonicalUrl,
        companyUrl: raw.companyUrl,
        location: raw.locationLine,
        country: raw.countryGuess,
        posted: raw.postedText || "Recently posted",
        meta: raw.metaTags,
        matchReasons: reasons,
        visa: {
          status: visaInfo.status,
          evidence: visaInfo.evidence,
        },
        searchLabel: raw.search.label,
        searchKeywords: raw.search.keywords,
        source: "LinkedIn",
        fetchedAt: new Date().toISOString(),
      };

      JOBS.set(entry.id, entry);
      if (countByCountry(search.country) >= search.maxJobs) {
        return;
      }
    }

    await delay(1400);
  }
}

function countByCountry(country: string): number {
  let total = 0;
  for (const job of JOBS.values()) {
    if (job.country.toLowerCase().includes(country.toLowerCase())) {
      total += 1;
    }
  }
  return total;
}

async function main() {
  for (const search of SEARCHES) {
    if (countByCountry(search.country) >= search.maxJobs) continue;
    await processSearch(search);
    await delay(2000);
  }

  const items = Array.from(JOBS.values()).sort((a, b) => a.country.localeCompare(b.country) || a.title.localeCompare(b.title));
  const payload = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    jobs: items,
  };

  const outputPath = path.resolve("src/data/jobs.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`Saved ${items.length} jobs to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
