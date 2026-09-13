export type ProjectFlatCard = {
  title: string;
  area: string;
  image: string;
  amenities: string[];
};

export const DEFAULT_PROJECT_FLATS: ProjectFlatCard[] = [
  {
    title: "1 BHK",
    area: "850 SQft.",
    image: "",
    amenities: ["Open living room", "Modern kitchen", "Private balcony", "Smart storage"],
  },
  {
    title: "2 BHK",
    area: "1,250 SQft.",
    image: "",
    amenities: ["Two bedrooms", "Dining space", "Two balconies", "Utility zone"],
  },
  {
    title: "3 BHK",
    area: "1,900 SQft.",
    image: "",
    amenities: ["Three bedrooms", "Family lounge", "Servant utility", "Panoramic views"],
  },
];

export function getProjectFlats(extra: unknown): ProjectFlatCard[] {
  const raw =
    extra && typeof extra === "object" && !Array.isArray(extra)
      ? (extra as Record<string, unknown>).flats
      : undefined;
  if (!Array.isArray(raw)) return DEFAULT_PROJECT_FLATS;

  return DEFAULT_PROJECT_FLATS.map((fallback, index) => {
    const item = raw[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) return fallback;
    const value = item as Record<string, unknown>;
    const amenities = Array.isArray(value.amenities)
      ? value.amenities.filter((entry): entry is string => typeof entry === "string").slice(0, 4)
      : fallback.amenities;
    return {
      title: typeof value.title === "string" && value.title.trim() ? value.title : fallback.title,
      area: typeof value.area === "string" && value.area.trim() ? value.area : fallback.area,
      image: typeof value.image === "string" ? value.image : fallback.image,
      amenities: [...amenities, ...fallback.amenities].slice(0, 4),
    };
  });
}

export function mergeProjectFlats(extra: unknown, flats: ProjectFlatCard[]) {
  const base =
    extra && typeof extra === "object" && !Array.isArray(extra)
      ? (extra as Record<string, unknown>)
      : {};
  return { ...base, flats };
}