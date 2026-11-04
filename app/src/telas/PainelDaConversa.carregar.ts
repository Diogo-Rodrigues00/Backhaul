// Carregamento sob demanda do chat da proposta (ADR 0016 e ADR 0011): organismo, hook de tela e
// regras de validação só entram no navegador no primeiro "Abrir conversa", fora do JS inicial da
// rota e do corpo da tela. Em arquivo próprio porque o Jest não executa `import()` dinâmico; os
// testes trocam este módulo por um que devolve o componente na hora (jest.setup.ts).
/* istanbul ignore file */
import { comNovaTentativa } from '@/lib/carregamento';

export function carregarPainelDaConversa() {
  return comNovaTentativa(() => import('./PainelDaConversa'));
}
