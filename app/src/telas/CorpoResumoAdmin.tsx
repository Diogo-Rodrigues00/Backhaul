// Corpo do resumo do admin (card 040): 11 números da API em quatro grupos, cada um uma lista de termos
// e definições. Sem atualização automática (ADR 0010): só "Atualizar". Valores exatamente como a API
// devolveu; nenhuma conta nem percentual aqui. Abre por React.lazy (`CorpoResumoAdmin.carregar.ts`),
// fora do JS inicial da rota.
import { View, type ViewStyle } from 'react-native';

import { useResumoAdmin } from '@/api/admin.hooks';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { ListaDeFatos, type ItemDeFato } from '@/components/molecules/ListaDeFatos';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { ErroApi } from '@/lib/erros';
import { formatarMoeda } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export const ANUNCIO_RESUMO_ATUALIZADO = 'Resumo atualizado';

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    bloco: { gap: space[4] } satisfies ViewStyle,
    grupo: {
      gap: space[3],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
  } as const;
}

export default function CorpoResumoAdmin() {
  const { habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const consulta = useResumoAdmin({ habilitado });
  const resumo = consulta.data?.resumo;
  // Erro no lugar dos números só quando não há o que mostrar. Com números na tela e "Atualizar"
  // falhando, eles ficam e um aviso de erro aparece acima deles.
  const falhouComDados = consulta.isError && resumo !== undefined;

  const grupos: readonly { titulo: string; itens: readonly ItemDeFato[] }[] = resumo
    ? [
        {
          titulo: 'Pessoas',
          itens: [
            { rotulo: 'Motoristas', valor: String(resumo.motoristas) },
            { rotulo: 'Empresas', valor: String(resumo.empresas) },
          ],
        },
        {
          titulo: 'Operação',
          itens: [
            { rotulo: 'Cargas abertas', valor: String(resumo.cargas_abertas) },
            { rotulo: 'Propostas pendentes', valor: String(resumo.propostas_pendentes) },
            {
              rotulo: 'Certificações aguardando aprovação',
              valor: String(resumo.certificacoes_pendentes),
            },
          ],
        },
        {
          titulo: 'Fretes',
          itens: [
            { rotulo: 'Aceitos', valor: String(resumo.fretes_aceitos) },
            { rotulo: 'Em trânsito', valor: String(resumo.fretes_em_transito) },
            { rotulo: 'Entregues', valor: String(resumo.fretes_entregues) },
          ],
        },
        {
          titulo: 'Dinheiro',
          itens: [
            {
              rotulo: 'Volume dos fretes entregues',
              valor: formatarMoeda(resumo.volume_liberado),
            },
            {
              rotulo: 'Comissão recebida (fretes entregues)',
              valor: formatarMoeda(resumo.comissao_total),
            },
            {
              rotulo: 'Comissão retida (aguardando entrega)',
              valor: formatarMoeda(resumo.comissao_retida),
            },
          ],
        },
      ]
    : [];

  return (
    <ConteudoLista
      estado={resumo ? 'pronto' : consulta.isError ? 'erro' : 'carregando'}
      textoCarregando="Carregando resumo…"
      erro={{
        mensagem: mensagemDeErro(consulta.error),
        aoTentarDeNovo: () => void consulta.refetch(),
      }}
      aoAtualizar={() => consulta.refetch()}
      atualizando={consulta.isFetching}
      anuncioAtualizado={falhouComDados ? '' : ANUNCIO_RESUMO_ATUALIZADO}
    >
      <View style={estilos.bloco}>
        {falhouComDados ? (
          <EstadoErro
            mensagem={mensagemDeErro(consulta.error)}
            aoTentarDeNovo={() => consulta.refetch()}
            tentando={consulta.isFetching}
          />
        ) : null}
        {grupos.map((grupo) => (
          <View
            key={grupo.titulo}
            style={[
              estilos.grupo,
              { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
            ]}
          >
            <Titulo nivel={2}>{grupo.titulo}</Titulo>
            <ListaDeFatos itens={grupo.itens} />
          </View>
        ))}
      </View>
    </ConteudoLista>
  );
}
