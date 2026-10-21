import { test as base, type Page } from '@playwright/test';

export type Perfil = 'empresa' | 'motorista' | 'admin';

// Mesma chave e mesmos tokens de scripts/lhci-login.cjs (ADR 0012).
export const CHAVE_TOKEN = 'backhaul.token';

// Grava o token de mock no localStorage antes de qualquer script da página rodar.
export async function entrarComoPerfil(page: Page, perfil: Perfil | null): Promise<void> {
  if (perfil === null) return;
  await page.addInitScript(([chave, valor]) => window.localStorage.setItem(chave, valor), [
    CHAVE_TOKEN,
    `mock-${perfil}`,
  ] as const);
}

export const test = base;
export { expect } from '@playwright/test';
