// Solo la lista NAICS 2022 (liviana) para usar también en componentes cliente.
// No importar lib/codes/official.ts desde el cliente: incluye listas pesadas (UNSPSC).
import naicsList from "./naics-2022.json";

const NAICS = naicsList as Record<string, string>;

export function naicsTitle(code: string): string | null {
  return NAICS[String(code ?? "").trim()] ?? null;
}

export function isValidNaics(code: string): boolean {
  return !!naicsTitle(code);
}
