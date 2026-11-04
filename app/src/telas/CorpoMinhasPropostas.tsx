// Corpo de "Minhas propostas" do motorista (card 026, MVP-15, CT-09): a lista que a API devolve (ordem
// da API) com a atualização automática a cada 10 s, só com a aba visível (ADR 0010). Mudança de status
// (aceita, recusada, expirada) é anunciada sem mover o foco. Carregado por React.lazy a partir de
// `app/motorista/propostas.tsx` (ADR 0011). Sem plano B local: a lista só vem da API.
import { useCallback, useState } from 'react';

import { useMinhasPropostas } from '@/api/propostas.hooks';
import { Link } from '@/components/atoms/Link';
import { Lista } from '@/components/molecules/Lista';
import { CartaoMinhaProposta } from '@/components/organisms/CartaoMinhaProposta';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { descreverMudancasPropostas } from '@/lib/descreverMudancasPropostas';
import { ErroApi } from '@/lib/erros';

/** Só a mensagem de erro de negócio da API (404 "perfil de motorista não encontrado") aparece. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

export default function CorpoMinhasPropostas() {
  const { habilitado } = useCasca();
  const consulta = useMinhasPropostas({ automatico: true, habilitado });
  const { refetch } = consulta;

  // A lista da API já vem em ordem (mais recentes primeiro): a tela não reordena.
  const lista = consulta.data?.propostas;

  // Mudança de status: a frase vai à barra de novidades e à região viva (ADR 0010).
  const [novidade, setNovidade] = useState('');
  useAnunciarNovidades(lista, (anterior, atual) => {
    const texto = descreverMudancasPropostas(anterior, atual);
    setNovidade(texto ?? '');
    return texto;
  });

  const [atualizando, setAtualizando] = useState(false);
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }, [refetch]);

  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (lista === undefined) estado = consulta.isError ? 'erro' : 'carregando';
  else estado = lista.length === 0 ? 'vazio' : 'pronto';

  return (
    <ConteudoLista
      estado={estado}
      textoCarregando="Carregando suas propostas…"
      vazio={{
        titulo: 'Você ainda não fez propostas',
        descricao:
          'Quando você enviar uma proposta ou contraproposta para uma carga, ela aparece aqui com a resposta da empresa.',
        acao: <Link href="/motorista/cargas">Ver cargas próximas</Link>,
        icone: 'file',
      }}
      erro={{
        mensagem: mensagemDeErro(consulta.error),
        aoTentarDeNovo: atualizar,
        tentando: atualizando,
      }}
      aoAtualizar={atualizar}
      atualizando={atualizando}
      novidade={{ titulo: novidade, atualizadoEm: consulta.dataUpdatedAt }}
    >
      <Lista
        rotulo="Propostas"
        itens={lista ?? []}
        chave={(proposta) => proposta.id}
        renderizarItem={(proposta) => (
          <CartaoMinhaProposta
            tipoCarga={proposta.tipo_carga}
            empresa={proposta.empresa}
            tipo={proposta.tipo}
            status={proposta.status}
            valorOferecido={proposta.valor_oferecido}
            valorProposto={proposta.valor_proposto}
            criadoEm={proposta.criado_em}
            freteId={proposta.frete_id}
          />
        )}
      />
    </ConteudoLista>
  );
}
