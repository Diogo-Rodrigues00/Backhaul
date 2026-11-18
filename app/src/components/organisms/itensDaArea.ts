import type { ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import type { TipoPerfil } from '@/lib/areas';

// Navegação de cada perfil (arquitetura.md, seção 3; ícones e rótulos do protótipo aprovado).
// Cabeçalho (acima de 960 px) mostra a lista inteira; barra inferior (até 960 px) mostra os itens sem
// `noMais` e põe os marcados com `noMais` dentro do "Mais". O administrador não tem navegação nesta
// versão (D-PO-10).
const ITENS: Record<TipoPerfil, readonly ItemNavegacao[]> = {
  empresa: [
    { href: '/empresa/cargas', rotulo: 'Minhas cargas', icone: 'package' },
    { href: '/empresa/cargas/nova', rotulo: 'Publicar carga', icone: 'plus' },
    { href: '/empresa/fretes', rotulo: 'Meus fretes', icone: 'truck' },
  ],
  motorista: [
    { href: '/motorista/cargas', rotulo: 'Cargas próximas', icone: 'map-pin' },
    {
      href: '/motorista/disponibilidades',
      rotulo: 'Disponibilidade',
      icone: 'locate',
      noMais: true,
    },
    { href: '/motorista/propostas', rotulo: 'Minhas propostas', icone: 'file' },
    { href: '/motorista/fretes', rotulo: 'Meus fretes', icone: 'truck' },
    { href: '/motorista/certificacoes', rotulo: 'Certificações', icone: 'award', noMais: true },
    { href: '/motorista/chave-pix', rotulo: 'Chave Pix', icone: 'banknote', noMais: true },
  ],
  // Itens do admin, na ordem do menu. O item da fila de certificações chama "Aprovações" (decisão de 04/11).
  admin: [
    { href: '/admin', rotulo: 'Resumo', icone: 'inbox' },
    { href: '/admin/certificacoes', rotulo: 'Aprovações', icone: 'hourglass' },
    { href: '/admin/fretes', rotulo: 'Fretes', icone: 'truck' },
    { href: '/admin/usuarios', rotulo: 'Usuários', icone: 'user' },
  ],
};

export function itensDaArea(area: TipoPerfil): readonly ItemNavegacao[] {
  return ITENS[area];
}
