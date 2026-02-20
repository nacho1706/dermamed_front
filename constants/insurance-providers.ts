/**
 * Argentine insurance providers (Obras Sociales & Prepagas)
 * Curated list of the most common providers in Argentina.
 */

export interface InsuranceProvider {
  value: string;
  label: string;
  category: "prepaga" | "obra_social" | "provincial" | "other";
}

export const INSURANCE_PROVIDERS: InsuranceProvider[] = [
  // ── Particular (sin cobertura) ────────────────────────────────────────
  {
    value: "Particular",
    label: "Particular (sin cobertura)",
    category: "other",
  },

  // ── Prepagas ──────────────────────────────────────────────────────────
  { value: "OSDE", label: "OSDE", category: "prepaga" },
  { value: "Swiss Medical", label: "Swiss Medical", category: "prepaga" },
  { value: "Galeno", label: "Galeno", category: "prepaga" },
  { value: "Medifé", label: "Medifé", category: "prepaga" },
  { value: "Omint", label: "Omint", category: "prepaga" },
  {
    value: "Hospital Italiano",
    label: "Hospital Italiano",
    category: "prepaga",
  },
  { value: "Hospital Alemán", label: "Hospital Alemán", category: "prepaga" },
  {
    value: "Hospital Británico",
    label: "Hospital Británico",
    category: "prepaga",
  },
  { value: "Medicus", label: "Medicus", category: "prepaga" },
  { value: "Sancor Salud", label: "Sancor Salud", category: "prepaga" },
  { value: "Accord Salud", label: "Accord Salud", category: "prepaga" },
  { value: "ACA Salud", label: "ACA Salud", category: "prepaga" },
  { value: "Avalian", label: "Avalian (ex Aca Salud)", category: "prepaga" },
  {
    value: "Centro Médico Pueyrredón",
    label: "Centro Médico Pueyrredón",
    category: "prepaga",
  },
  { value: "CEMIC", label: "CEMIC", category: "prepaga" },
  { value: "Contrastar", label: "Contrastar", category: "prepaga" },
  { value: "Docthos", label: "Docthos", category: "prepaga" },
  { value: "Federada Salud", label: "Federada Salud", category: "prepaga" },
  { value: "Hominis", label: "Hominis", category: "prepaga" },
  {
    value: "Jerárquicos Salud",
    label: "Jerárquicos Salud",
    category: "prepaga",
  },
  { value: "Luis Pasteur", label: "Luis Pasteur", category: "prepaga" },
  {
    value: "Medifé Asociación Civil",
    label: "Medifé Asociación Civil",
    category: "prepaga",
  },
  {
    value: "MET Medicina Privada",
    label: "MET Medicina Privada",
    category: "prepaga",
  },
  { value: "Parque Salud", label: "Parque Salud", category: "prepaga" },
  { value: "Plan de Salud", label: "Plan de Salud", category: "prepaga" },
  { value: "Premedic", label: "Premedic", category: "prepaga" },
  { value: "SancorSalud", label: "SancorSalud", category: "prepaga" },
  { value: "UP!", label: "UP! Salud", category: "prepaga" },
  { value: "Vittal", label: "Vittal", category: "prepaga" },
  { value: "William Hope", label: "William Hope", category: "prepaga" },

  // ── Obras Sociales Sindicales ─────────────────────────────────────────
  { value: "OSDIPP", label: "OSDIPP (Perfumistas)", category: "obra_social" },
  {
    value: "OSECAC",
    label: "OSECAC (Empleados de Comercio)",
    category: "obra_social",
  },
  { value: "OSPACA", label: "OSPACA (Pasteleros)", category: "obra_social" },
  { value: "OSPLAD", label: "OSPLAD (Docentes)", category: "obra_social" },
  {
    value: "OSPECON",
    label: "OSPECON (Construcción)",
    category: "obra_social",
  },
  {
    value: "OSUTHGRA",
    label: "OSUTHGRA (Gastronómicos)",
    category: "obra_social",
  },
  { value: "OSMATA", label: "OSMATA (Mecánicos)", category: "obra_social" },
  { value: "OSPOCE", label: "OSPOCE (Comercial)", category: "obra_social" },
  { value: "OSPJN", label: "OSPJN (Poder Judicial)", category: "obra_social" },
  { value: "OSDOP", label: "OSDOP (Ópticos)", category: "obra_social" },
  { value: "OSSEG", label: "OSSEG (Seguros)", category: "obra_social" },
  { value: "OSDE Binario", label: "OSDE Binario", category: "obra_social" },
  { value: "UPCN", label: "UPCN", category: "obra_social" },
  { value: "OSFATLYF", label: "OSFATLYF (Tabaco)", category: "obra_social" },
  { value: "UOM", label: "UOM (Metalúrgicos)", category: "obra_social" },

  // ── Provinciales / Estatales ──────────────────────────────────────────
  { value: "PAMI", label: "PAMI", category: "provincial" },
  { value: "IOMA", label: "IOMA (Buenos Aires)", category: "provincial" },
  { value: "IOSPER", label: "IOSPER (Entre Ríos)", category: "provincial" },
  { value: "IAPOS", label: "IAPOS (Santa Fe)", category: "provincial" },
  { value: "IPROSS", label: "IPROSS (Río Negro)", category: "provincial" },
  { value: "DOSEP", label: "DOSEP (San Luis)", category: "provincial" },
  { value: "OSEP", label: "OSEP (Mendoza)", category: "provincial" },
  { value: "IPS Misiones", label: "IPS Misiones", category: "provincial" },
  { value: "SEMPRE", label: "SEMPRE (Corrientes)", category: "provincial" },
  { value: "OSEP Tucumán", label: "OSEP (Tucumán)", category: "provincial" },

  // ── Otra ──────────────────────────────────────────────────────────────
  { value: "Otra", label: "Otra (ingresar manualmente)", category: "other" },
];

/**
 * Get label for a given provider value
 */
export function getInsuranceLabel(value: string): string {
  const provider = INSURANCE_PROVIDERS.find((p) => p.value === value);
  return provider?.label || value;
}
