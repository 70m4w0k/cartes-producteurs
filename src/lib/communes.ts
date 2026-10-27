/**
 * Communes de la vallée d'Ax-les-Thermes et alentours (Haute-Ariège).
 * Le centre sert de position publique pour les producteurs anonymes.
 */
export const COMMUNES = [
  { name: "Ax-les-Thermes", lat: 42.7208, lng: 1.8386 },
  { name: "Ascou", lat: 42.7247, lng: 1.8969 },
  { name: "Caussou", lat: 42.7661, lng: 1.8253 },
  { name: "Ignaux", lat: 42.7367, lng: 1.8414 },
  { name: "L'Hospitalet-près-l'Andorre", lat: 42.59, lng: 1.8008 },
  { name: "Luzenac", lat: 42.7656, lng: 1.7556 },
  { name: "Mérens-les-Vals", lat: 42.6559, lng: 1.835 },
  { name: "Montaillou", lat: 42.7889, lng: 1.8964 },
  { name: "Orgeix", lat: 42.7072, lng: 1.865 },
  { name: "Orlu", lat: 42.7036, lng: 1.8853 },
  { name: "Perles-et-Castelet", lat: 42.7483, lng: 1.7811 },
  { name: "Prades", lat: 42.7942, lng: 1.8697 },
  { name: "Savignac-les-Ormeaux", lat: 42.7333, lng: 1.8183 },
  { name: "Sorgeat", lat: 42.7342, lng: 1.8547 },
  { name: "Tignac", lat: 42.7464, lng: 1.8197 },
  { name: "Unac", lat: 42.7706, lng: 1.7425 },
  { name: "Vaychis", lat: 42.7442, lng: 1.8122 },
] as const;

export type CommuneName = (typeof COMMUNES)[number]["name"];

export const COMMUNE_NAMES = COMMUNES.map((c) => c.name) as [CommuneName, ...CommuneName[]];

/** Centre de la carte : Ax-les-Thermes. */
export const VALLEY_CENTER: [number, number] = [42.735, 1.84];

export function findCommune(name: string) {
  return COMMUNES.find((c) => c.name === name);
}
