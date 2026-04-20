export function getFallbackGradientByInitials(initials, seed = "") {
  const gradients = ["red", "orange", "green", "blue", "purple"];

  const normalizedInitials = initials
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/Ё/g, "Е");
  const normalizedSeed = String(seed).trim().toUpperCase().replace(/\s+/g, "");
  const valueForHash = `${normalizedInitials}|${normalizedSeed}`;

  let hash = 0;

  for (let i = 0; i < valueForHash.length; i++) {
    hash = (hash * 31 + valueForHash.charCodeAt(i)) >>> 0;
  }

  return gradients[hash % gradients.length];
}
