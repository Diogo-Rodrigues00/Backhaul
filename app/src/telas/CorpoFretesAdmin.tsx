// Corpo dos fretes do admin (card 041): até 100 fretes, mais recentes primeiro, só leitura. Sem
// atualização automática (ADR 0010): só "Atualizar". Ordem e valores exatamente como a API devolveu.
// Abre por React.lazy (`CorpoFretesAdmin.carregar.ts`), fora do JS inicial da rota.
import { View } from 'react-native';

import { useFretesAdmin } from '@/api/admin.hooks';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { Lista } from '@/components/molecules/Lista';
import { CartaoFreteAdmin } from '@/components/organisms/CartaoFreteAdmin';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export const ANUNCIO_FRETES_ATUALIZADOS = 'Fretes atualizados';
/** A API devolve no máximo 100 fretes. */
export const LIMITE_FRETES_ADMIN = 100;

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function criarEstilos({ space }: TemaVisual) {
  return { bloco: { gap: space[4] } } as const;
}

export default function CorpoFretesAdmin() {
  const { habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const consulta = useFretesAdmin({ habilitado });
  const fretes = consulta.data?.fretes;
  // Com a lista na tela e "Atualizar" falhando, ela fica e um aviso de erro aparece acima.
  const falhouComDados = consulta.isError && fretes !== undefined;

  const estado: EstadoLista = fretes
    ? fretes.length === 0
      ? 'vazio'
      : 'pronto'
    : consulta.isError
      ? 'erro'
      : 'carregando';

  return (
    <ConteudoLista
      estado={estado}
      textoCarregando="Carregando fretes…"
      vazio={{
        titulo: 'Nenhum frete ainda',
        descricao: 'Os fretes aparecem aqui quando uma empresa aceitar uma proposta.',
        acao: <Link href="/admin">Voltar ao resumo</Link>,
        icone: 'truck',
      }}
      erro={{
        mensagem: mensagemDeErro(consulta.error),
        aoTentarDeNovo: () => void consulta.refetch(),
      }}
      aoAtualizar={() => consulta.refetch()}
      atualizando={consulta.isFetching}
      anuncioAtualizado={falhouComDados ? '' : ANUNCIO_FRETES_ATUALIZADOS}
    >
      <View style={estilos.bloco}>
        {falhouComDados ? (
          <EstadoErro
            mensagem={mensagemDeErro(consulta.error)}
            aoTentarDeNovo={() => consulta.refetch()}
            tentando={consulta.isFetching}
          />
        ) : null}
        <Titulo nivel={2}>Fretes mais recentes</Titulo>
        {(fretes?.length ?? 0) >= LIMITE_FRETES_ADMIN ? (
          <Texto cor="secundario">{`Mostrando os ${LIMITE_FRETES_ADMIN} mais recentes.`}</Texto>
        ) : null}
        <Lista
          rotulo="Fretes da plataforma"
          itens={fretes ?? []}
          chave={(frete) => frete.id}
          renderizarItem={(frete) => (
            <CartaoFreteAdmin
              tipoCarga={frete.tipo_carga}
              empresa={frete.empresa}
              motorista={frete.motorista}
              placa={frete.veiculo_placa}
              valorFinal={frete.valor_final}
              statusEntrega={frete.status_entrega}
              statusPagamento={frete.status_pagamento}
              valorComissao={frete.valor_comissao}
              criadoEm={frete.criado_em}
            />
          )}
        />
      </View>
    </ConteudoLista>
  );
}
