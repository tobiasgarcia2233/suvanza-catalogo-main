// URL-safe slug from a display name: "Expo Suvanza 2026" → "expo-suvanza-2026".
// Shared by server queries and client forms (live slug preview).
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
