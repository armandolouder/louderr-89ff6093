/**
 * Remove tudo que não for dígito de um telefone.
 * Equivalente direto a `phone.replace(/\D/g, "")` — duplicado em ~10 funções.
 */
export function digitsOnly(phone: string | null | undefined): string {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
}

/**
 * Normaliza para formato BR garantindo o DDI 55 quando aplicável.
 * Não adiciona/remove o 9º dígito (use `phoneCandidates` para isso).
 */
export function normalizeBrazilianPhone(phone: string | null | undefined): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 8) return null;
  if (digits.length >= 10 && !digits.startsWith("55")) return `55${digits}`;
  return digits;
}

/**
 * Gera variações de um telefone BR (com e sem o 9º dígito) para tentativas de envio.
 * Mantém a ordem de prioridade usada pelo `send-individual`.
 */
export function phoneCandidates(rawPhone: string): string[] {
  let normalized = digitsOnly(rawPhone);
  if (normalized.length >= 10 && !normalized.startsWith("55")) {
    normalized = `55${normalized}`;
  }

  const candidates = new Set<string>([normalized]);

  // 55 + DDD(2) + 9 + 8 dígitos = 13
  if (normalized.length === 13 && normalized.startsWith("55")) {
    const ddd = normalized.slice(2, 4);
    const rest = normalized.slice(5); // remove o 9
    candidates.add(`55${ddd}${rest}`);
  }
  // 55 + DDD(2) + 8 dígitos = 12 (faltando o 9)
  if (normalized.length === 12 && normalized.startsWith("55")) {
    const ddd = normalized.slice(2, 4);
    const rest = normalized.slice(4);
    candidates.add(`55${ddd}9${rest}`);
  }

  return Array.from(candidates);
}