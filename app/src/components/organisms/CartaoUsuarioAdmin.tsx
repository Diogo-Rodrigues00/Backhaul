// Cartão de usuário do admin (card 041): só leitura. O título é o nome (o admin não tem nome: usa o
// e-mail). Nenhum documento: a API não manda CPF nem CNPJ e este cartão só recebe os campos abaixo.
import { useId } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Titulo } from '@/components/atoms/Titulo';
import { ListaDeFatos, type ItemDeFato } from '@/components/molecules/ListaDeFatos';
import { rotuloDoPerfil, type TipoPerfil } from '@/lib/areas';
import { formatarDataHora } from '@/lib/formatacao';
import { QUEBRA_ONDE_PRECISAR } from '@/lib/quebraDeTexto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoUsuarioAdmin {
  /** `null` para o admin. */
  nome: string | null;
  email: string;
  tipo: TipoPerfil;
  ativo: boolean;
  criadoEm: string;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
  } as const;
}

/** Usuário na lista do admin: `article` com nome (ou e-mail) em `h3` e os fatos em `<dl>`. */
export function CartaoUsuarioAdmin({
  nome,
  email,
  tipo,
  ativo,
  criadoEm,
}: PropsCartaoUsuarioAdmin) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-usuario-admin`;
  const itens: readonly ItemDeFato[] = [
    { rotulo: 'E-mail', valor: email },
    { rotulo: 'Perfil', valor: rotuloDoPerfil(tipo) },
    { rotulo: 'Situação', valor: ativo ? 'Ativo' : 'Inativo' },
    { rotulo: 'Cadastrado em', valor: formatarDataHora(criadoEm) },
  ];

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <Titulo nivel={3} nativeID={idTitulo} style={QUEBRA_ONDE_PRECISAR}>
        {nome ?? email}
      </Titulo>
      <ListaDeFatos itens={itens} />
    </View>
  );
}
