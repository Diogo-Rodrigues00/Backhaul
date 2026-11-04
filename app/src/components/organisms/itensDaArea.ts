import type { ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import type { TipoPerfil } from '@/lib/areas';

// Navegação de cada perfil (arquitetura.md, seção 3; ícones e rótulos do protótipo aprovado).
// Cabeçalho (acima de 960 px) e barra inferior (até 960 px) recebem a mesma lista.
// O administrador não tem navegação nesta versão (D-PO-10).
const ITENS: Record<TipoPerfil, readonly ItemNavegacao[]> = {
  empresa: [
    { href: '/empresa/cargas', rotulo: 'Minhas cargas', icone: 'package' },
    { href: '/empresa/cargas/nova', rotulo: 'Publicar carga', icone: 'plus' },
    { href: '/empresa/fretes', rotulo: 'Meus fretes', icone: 'truck' },
  ],
  // "Minhas propostas" (/motorista/propostas) fica de fora: o card 026 está cortado do MVP e a rota
  // não existe (404). Volta a esta lista quando a rota existir.
  motorista: [
    { href: '/motorista/cargas', rotulo: 'Cargas próximas', icone: 'map-pin' },
    { href: '/motorista/disponibilidades', rotulo: 'Disponibilidade', icone: 'locate' },
    { href: '/motorista/fretes', rotulo: 'Meus fretes', icone: 'truck' },
    // Card 031. Decisão de 2026-11-04: "Certificações" fica dentro de "Mais" (com Disponibilidade) na
    // barra inferior de 4 itens, criada no card 026. Até o "Mais" existir, é um item comum (4 itens).
    { href: '/motorista/certificacoes', rotulo: 'Certificações', icone: 'award' },
  ],
  admin: [],
};

export function itensDaArea(area: TipoPerfil): readonly ItemNavegacao[] {
  return ITENS[area];
}
