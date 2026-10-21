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
  motorista: [
    { href: '/motorista/cargas', rotulo: 'Cargas próximas', icone: 'map-pin' },
    { href: '/motorista/disponibilidades', rotulo: 'Disponibilidade', icone: 'locate' },
    { href: '/motorista/propostas', rotulo: 'Minhas propostas', icone: 'file' },
    { href: '/motorista/fretes', rotulo: 'Meus fretes', icone: 'truck' },
  ],
  admin: [],
};

export function itensDaArea(area: TipoPerfil): readonly ItemNavegacao[] {
  return ITENS[area];
}
