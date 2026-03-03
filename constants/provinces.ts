/**
 * Argentine provinces list (24 jurisdictions)
 * Sorted alphabetically for dropdown display
 */
export const ARGENTINE_PROVINCES = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

export type ArgentineProvince = (typeof ARGENTINE_PROVINCES)[number];
