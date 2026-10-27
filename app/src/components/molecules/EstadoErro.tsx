import { Botao } from '@/components/atoms/Botao';

import { Banner } from './Banner';

export interface PropsEstadoErro {
  /** Mensagem do servidor, como veio (400/403/404/409). Padrão: "Algo deu errado. Tente de novo." */
  mensagem?: string;
  /** Refaz a leitura que falhou (`refetch()`). */
  aoTentarDeNovo: () => void | Promise<unknown>;
  /** Tentando de novo agora: o botão mostra "Tentando…" e ignora toques. */
  tentando?: boolean;
}

export const MENSAGEM_ERRO_PADRAO = 'Algo deu errado. Tente de novo.';

/**
 * Erro de carregamento (CT-03): Banner de erro (`role="alert"`) com o botão "Tentar de novo".
 */
export function EstadoErro({
  mensagem = MENSAGEM_ERRO_PADRAO,
  aoTentarDeNovo,
  tentando = false,
}: PropsEstadoErro) {
  return (
    <Banner
      variante="erro"
      acao={
        <Botao
          variante="secundario"
          icone="refresh"
          carregando={tentando}
          rotuloCarregando="Tentando…"
          aoPressionar={aoTentarDeNovo}
        >
          Tentar de novo
        </Botao>
      }
    >
      {mensagem}
    </Banner>
  );
}
