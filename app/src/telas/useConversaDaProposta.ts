// Hook de tela do chat da proposta (card 042, ADR 0016): liga os hooks de mensagens do `integracao-api`
// ao organismo `ConversaDaProposta`, descobre quem sou eu (`usuario.id` da sessão), decide se a
// conversa está encerrada, traduz os erros e anuncia as mensagens novas da outra parte. Serve às duas
// telas (empresa e motorista). Só existe enquanto a conversa está aberta: fechar desmonta o
// observador e o polling de 10 s para (ADR 0010).
import { useCallback, useState } from 'react';

import { useEnviarMensagem, useMensagens } from '@/api/mensagens.hooks';
import type { PropsConversaDaProposta } from '@/components/organisms/ConversaDaProposta';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { descreverMensagensNovas } from '@/lib/descreverMensagensNovas';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import type { StatusProposta } from '@/lib/rotulos';
import { useSessao } from '@/state/sessao/useSessao';

export interface EntradaConversaDaProposta {
  propostaId: string;
  /** Status que a tela já tem da proposta: recusada e expirada encerram a conversa (ADR 0016). */
  statusDaProposta: StatusProposta;
  /** Quem está do outro lado (nome do motorista ou da empresa): é o autor das mensagens que não são minhas. */
  nomeDaOutraParte: string;
}

function eStatus(erro: unknown, status: number): boolean {
  return erro instanceof ErroApi && erro.status === status;
}

/** Mensagem da API quando é de negócio (400, 404); 5xx e falha de rede usam o texto padrão. */
function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi && (erro.tipo === 'validacao' || erro.tipo === 'mensagem')
    ? erro.mensagens.join(' ')
    : MENSAGEM_FALHA;
}

export function useConversaDaProposta({
  propostaId,
  statusDaProposta,
  nomeDaOutraParte,
}: EntradaConversaDaProposta): Omit<PropsConversaDaProposta, 'id'> {
  const { usuario } = useSessao();
  const meuUsuarioId = usuario?.id ?? null;

  const consulta = useMensagens(propostaId, { automatico: true });
  const envio = useEnviarMensagem(propostaId);
  const { refetch } = consulta;
  const { mutateAsync } = envio;
  const mensagens = consulta.data?.mensagens;

  // Só mensagens da outra parte, sem a primeira carga e sem mover o foco. Sem saber quem sou eu,
  // não dá para separar as minhas das dele: o retrato só vale depois que o id chega.
  useAnunciarNovidades(meuUsuarioId === null ? undefined : mensagens, (anterior, atual) =>
    descreverMensagensNovas(anterior, atual, meuUsuarioId ?? '', nomeDaOutraParte),
  );

  // A API respondeu 409 quando a tela ainda achava a proposta aberta (encerrou enquanto eu escrevia).
  const [encerradaPelaApi, setEncerradaPelaApi] = useState(false);
  const [erroDoCampo, setErroDoCampo] = useState<string | undefined>();
  const encerrada =
    statusDaProposta === 'recusada' || statusDaProposta === 'expirada' || encerradaPelaApi;

  const aoEnviar = useCallback(
    async (texto: string): Promise<boolean> => {
      setErroDoCampo(undefined);
      try {
        await mutateAsync(texto);
        return true;
      } catch (erro) {
        if (eStatus(erro, 409)) setEncerradaPelaApi(true);
        else setErroDoCampo(mensagemDoErro(erro));
        return false;
      }
    },
    [mutateAsync],
  );

  // Falha só no primeiro carregamento vira erro dentro da conversa: se o polling falhar com o
  // histórico já na tela, a pessoa continua lendo e escrevendo.
  const falhouAoLer = consulta.isError && mensagens === undefined;

  return {
    mensagens,
    meuUsuarioId,
    nomeDaOutraParte,
    encerrada,
    carregando: consulta.isPending,
    erroDeCarga: falhouAoLer ? mensagemDoErro(consulta.error) : undefined,
    aoTentarDeNovo: refetch,
    tentandoDeNovo: falhouAoLer && consulta.isFetching,
    enviando: envio.isPending,
    erroDoCampo,
    aoEnviar,
    aoMudarTexto: useCallback(() => setErroDoCampo(undefined), []),
  };
}
