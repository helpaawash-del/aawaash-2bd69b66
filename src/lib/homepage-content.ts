/**
 * Public homepage content model.
 *
 * The marketing homepage (`src/routes/index.tsx`) renders from this document.
 * Admins edit it at /admin/homepage; it is persisted as a single JSON row in
 * `cms_global_content` under the key `homepage`, so reads are one cheap query
 * and every section falls back to the shipped defaults when a field is blank.
 */

export type HomeItem = { title: string; body?: string };

export type HomeSection = {
  enabled: boolean;
  eyebrow?: string;
  title?: string;
  accent?: string;
  subtitle?: string;
  image?: string;
  items?: HomeItem[];
};

export type HomepageDoc = Record<string, HomeSection>;

export type FieldKey = "eyebrow" | "title" | "accent" | "subtitle" | "image";

export type SectionSpec = {
  id: string;
  label: string;
  hint: string;
  fields: FieldKey[];
  items?: { label: string; titleLabel: string; bodyLabel: string | null };
};

/** Order here drives both the editor and the homepage section order. */
export const SECTION_SPECS: SectionSpec[] = [
  {
    id: "hero",
    label: "Hero",
    hint: "The first screen — badge pill, headline and supporting copy.",
    fields: ["eyebrow", "title", "accent", "subtitle"],
  },
  {
    id: "categories",
    label: "Browse by category",
    hint: "Category tiles shown under the hero.",
    fields: ["eyebrow", "title", "accent", "subtitle"],
    items: { label: "Categories", titleLabel: "Label", bodyLabel: "Caption" },
  },
  {
    id: "projects",
    label: "Projects",
    hint: "Featured residence heading and the cover photo shown on the project card.",
    fields: ["eyebrow", "title", "accent", "image"],
  },
  {
    id: "commission",
    label: "Commission slabs",
    hint: "Tiered commission ladder.",
    fields: ["eyebrow", "title", "accent", "subtitle"],
    items: { label: "Slabs", titleLabel: "Range", bodyLabel: null },
  },
  {
    id: "stats",
    label: "Statistics",
    hint: "Animated counters strip.",
    fields: [],
    items: { label: "Counters", titleLabel: "Label", bodyLabel: "Value (number)" },
  },
  {
    id: "lifestyle",
    label: "Lifestyle amenities",
    hint: "Amenities list with a supporting photo.",
    fields: ["eyebrow", "title", "accent", "subtitle", "image"],
    items: { label: "Amenities", titleLabel: "Amenity", bodyLabel: "Description" },
  },
  {
    id: "smart",
    label: "Smart tools",
    hint: "Widget cards for buyers.",
    fields: ["eyebrow", "title", "subtitle"],
    items: { label: "Tools", titleLabel: "Title", bodyLabel: "Description" },
  },
  {
    id: "visit",
    label: "Book a visit",
    hint: "Gradient call-to-action banner.",
    fields: ["eyebrow", "title", "subtitle"],
  },
  {
    id: "how",
    label: "How it works",
    hint: "Company → leader → member → payout ladder.",
    fields: ["eyebrow", "title", "subtitle"],
    items: { label: "Steps", titleLabel: "Step", bodyLabel: "Description" },
  },
  {
    id: "faq",
    label: "FAQ",
    hint: "Frequently asked questions.",
    fields: ["eyebrow", "title"],
    items: { label: "Questions", titleLabel: "Question", bodyLabel: "Answer" },
  },
  {
    id: "contact",
    label: "Contact",
    hint: "Contact details and enquiry form.",
    fields: ["eyebrow", "title", "subtitle"],
    items: { label: "Details", titleLabel: "Label", bodyLabel: "Value" },
  },
];

export const DEFAULT_HOMEPAGE: HomepageDoc = {
  hero: {
    enabled: true,
    eyebrow: "Curated Luxury Residences · India",
    title: "Home isn't a place.",
    accent: "It's a feeling.",
    subtitle:
      "Aawash brings together premium residential projects, a professional team system, and transparent commission tracking — all in one elegant, mobile-first experience.",
  },
  categories: {
    enabled: true,
    eyebrow: "Explore",
    title: "Browse by",
    accent: "category",
    subtitle:
      "Six curated collections — from skyline towers to garden villas. Find the home that fits your lifestyle.",
    items: [
      { title: "Apartments", body: "1,240+ homes" },
      { title: "Villas", body: "320 estates" },
      { title: "Towers", body: "78 landmarks" },
      { title: "Plots", body: "540 parcels" },
      { title: "Commercial", body: "96 spaces" },
      { title: "Luxury", body: "42 signature" },
    ],
  },
  projects: {
    enabled: true,
    eyebrow: "Featured Residence",
    title: "A home to",
    accent: "come home to.",
  },
  commission: {
    enabled: true,
    eyebrow: "Commission Slabs",
    title: "Simple, tiered,",
    accent: "transparent.",
    subtitle: "Ladders scale with deal value — clearly defined, always visible in your dashboard.",
    items: [
      { title: "₹0 – 1 Cr" },
      { title: "₹1 – 3 Cr" },
      { title: "₹3 – 5 Cr" },
      { title: "₹5 – 7 Cr" },
      { title: "₹7 – 10 Cr" },
      { title: "₹10 Cr+" },
    ],
  },
  stats: {
    enabled: true,
    items: [
      { title: "Projects", body: "24" },
      { title: "Buildings", body: "78" },
      { title: "Flats Sold", body: "1240" },
      { title: "Happy Customers", body: "950" },
    ],
  },
  lifestyle: {
    enabled: true,
    eyebrow: "Lifestyle Amenities",
    title: "A home that lives",
    accent: "beyond four walls.",
    subtitle:
      "Curated amenities, biophilic design, and community spaces — every Aawash residence is built for calm, everyday luxury.",
    items: [
      { title: "Infinity Pool", body: "Rooftop pools with skyline views" },
      { title: "Fitness Club", body: "24×7 wellness & recovery" },
      { title: "Sky Lounge", body: "Cafés and co-working" },
      { title: "Green Trails", body: "Cycling & jogging tracks" },
    ],
  },
  smart: {
    enabled: true,
    eyebrow: "Smart Tools",
    title: "Everything a modern buyer needs.",
    subtitle: "Native app widgets — designed for tapping, not scrolling.",
    items: [
      { title: "EMI Calculator", body: "Model monthly payments across tenures and rates." },
      { title: "AI Property Match", body: "Tell us your lifestyle — we surface the right homes." },
      { title: "Site Visit Booking", body: "Pick a slot. Concierge handles the rest." },
      { title: "Investment Score", body: "See appreciation & rental yield at a glance." },
      { title: "Compare Projects", body: "Side-by-side view — specs, price, timelines." },
      { title: "Saved Properties", body: "Your wishlist, synced across every device." },
    ],
  },
  visit: {
    enabled: true,
    eyebrow: "Book a Private Tour",
    title: "Walk through your future home in person.",
    subtitle:
      "Personalised site visits with our concierge — pick a project, tell us a time, we do the rest.",
  },
  how: {
    enabled: true,
    eyebrow: "Team System",
    title: "A clear ladder, from listing to payout.",
    subtitle:
      "Aawash's simple structure keeps everyone aligned — company, leaders, members, and customers.",
    items: [
      { title: "Company", body: "Aawash curates and lists premium residential projects." },
      { title: "Team Leader", body: "Each leader owns a team and drives regional sales." },
      { title: "Members", body: "Members work with buyers and close sales on the ground." },
      { title: "Customer Purchase", body: "Buyers book their home with total transparency." },
      { title: "Commission Distribution", body: "Earnings flow automatically through the ladder." },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: "Frequently Asked",
    title: "Answers, in plain words.",
    items: [
      {
        title: "How do I get access to Aawash?",
        body: "Aawash is invite-only. Your Team Leader or Super Admin creates your account and shares your Login ID.",
      },
      {
        title: "What is my Login ID?",
        body: "Team Leaders and Super Admins sign in with their 10-digit mobile number. Members sign in with their Team Letter followed by their mobile — e.g. A9876543210.",
      },
      {
        title: "How is commission calculated?",
        body: "Every project defines commission slabs by deal value. Once a sale is recorded, Aawash automatically distributes commission across the team ladder.",
      },
      {
        title: "Is Aawash available on mobile?",
        body: "Yes. Aawash is built mobile-first — it feels like a native app on your phone, tablet, and desktop alike.",
      },
      {
        title: "How secure is my data?",
        body: "Aawash uses role-based access control, row-level security in the database, and full audit logging on sensitive actions.",
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: "Contact",
    title: "Let's build your team on Aawash.",
    subtitle: "Reach out — we'll help you onboard leaders, members, and your first project.",
    items: [
      { title: "Phone", body: "+91 90000 00000" },
      { title: "Email", body: "hello@aawash.app" },
      { title: "Office", body: "Darbhanga, Bihar — 846004" },
    ],
  },
};

function cleanItems(v: unknown): HomeItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      title: typeof i.title === "string" ? i.title : "",
      body: typeof i.body === "string" ? i.body : undefined,
    }))
    .filter((i) => i.title.trim() !== "" || (i.body ?? "").trim() !== "");
  return items.length ? items : undefined;
}

/** Merge a stored (possibly partial / user-authored) doc over the shipped defaults. */
export function mergeHomepage(stored: unknown): HomepageDoc {
  const out: HomepageDoc = {};
  const src = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  for (const spec of SECTION_SPECS) {
    const base = DEFAULT_HOMEPAGE[spec.id] ?? { enabled: true };
    const raw = (src[spec.id] ?? {}) as Record<string, unknown>;
    const pick = (k: FieldKey) => {
      const v = raw[k];
      return typeof v === "string" && v.trim() !== "" ? v : base[k];
    };
    out[spec.id] = {
      enabled: typeof raw.enabled === "boolean" ? raw.enabled : (base.enabled ?? true),
      eyebrow: pick("eyebrow"),
      title: pick("title"),
      accent: pick("accent"),
      subtitle: pick("subtitle"),
      image: pick("image"),
      items: cleanItems(raw.items) ?? base.items,
    };
  }
  return out;
}
