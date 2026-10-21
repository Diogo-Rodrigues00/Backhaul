// Cola entre o react-hook-form, os erros da API e o ResumoErros (ADR 0007). Só tipos do RHF
// entram aqui (import type): a biblioteca fica no chunk das telas que têm formulário.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormSetError,
  UseFormSetFocus,
} from 'react-hook-form';

import { moverFoco } from '@/lib/a11y';
import { MENSAGEM_FALHA, separarMensagens, type ErroApi } from '@/lib/erros';

import type { ItemResumo, PropsResumoErros } from './ResumoErros';

export interface OpcoesErroApi<Form extends FieldValues, CampoApi extends string> {
  setError: UseFormSetError<Form>;
  /** Campo da API → campo do formulário, declarado na tela: `{ cpf: 'cpf', nome_completo: 'nomeCompleto' }`. */
  campos: Readonly<Record<CampoApi, Path<Form>>>;
  /** Recebe as mensagens que não são de um campo (409, 500, "erro geral"). Vazio limpa o resumo. */
  definirResumo: (mensagens: string[]) => void;
  /** Leva o foco ao `ResumoErros`. Só é chamado quando há mensagens no resumo. */
  focarResumo: () => void;
}

export interface ResultadoErroApi<Form extends FieldValues> {
  /** Campos do formulário que receberam erro da API. */
  camposComErro: Path<Form>[];
  /** Mensagens que foram para o resumo. */
  mensagensDoResumo: string[];
}

/**
 * Leva um `ErroApi` ao lugar certo (ADR 0007, CT-03):
 * - `validacao` (400): a mensagem que começa com o nome de um campo vai a esse campo (`setError`);
 *   as demais vão para o resumo.
 * - `mensagem` (409 etc.): texto da API no resumo.
 * - `falha` (rede, 500, não-JSON) e `sessao`: o texto padrão no resumo.
 * Depois: foco no resumo, se houver mensagem nele; senão, no primeiro campo com erro.
 */
export function aplicarErroApi<Form extends FieldValues, CampoApi extends string>(
  erro: ErroApi,
  { setError, campos, definirResumo, focarResumo }: OpcoesErroApi<Form, CampoApi>,
): ResultadoErroApi<Form> {
  const nomesDaApi = Object.keys(campos) as CampoApi[];
  const { porCampo, resumo } = separarMensagens(erro, nomesDaApi);
  const focarNoCampo = resumo.length === 0;
  const camposComErro: Path<Form>[] = [];

  for (const nome of nomesDaApi) {
    const mensagem = porCampo[nome];
    if (mensagem === undefined) continue;
    const campo = campos[nome];
    const falha = { type: 'servidor', message: mensagem };
    // `shouldFocus` foca o primeiro campo, mas só quando não há resumo (o resumo é quem recebe o foco).
    if (focarNoCampo && camposComErro.length === 0) setError(campo, falha, { shouldFocus: true });
    else setError(campo, falha);
    camposComErro.push(campo);
  }

  definirResumo(resumo);
  if (resumo.length > 0) focarResumo();
  return { camposComErro, mensagensDoResumo: resumo };
}

/** Erros do react-hook-form (`formState.errors`) como itens do resumo, na ordem dos campos. */
export function itensDeErros(erros: FieldErrors): ItemResumo[] {
  return Object.entries(erros).flatMap(([campo, erro]) => {
    const mensagem = erro?.message;
    return typeof mensagem === 'string' && mensagem !== '' ? [{ campo, mensagem }] : [];
  });
}

export interface OpcoesResumo<Form extends FieldValues> {
  /** `setFocus` do `useForm`: os links do resumo focam o campo por ele. */
  setFocus: UseFormSetFocus<Form>;
  /** Reenvia o formulário. Só aparece o botão "Tentar de novo" quando o erro foi uma falha. */
  aoTentarDeNovo?: () => void | Promise<unknown>;
  /** Reenviando agora (`formState.isSubmitting`). */
  tentando?: boolean;
}

export interface ControleResumo<Form extends FieldValues> {
  /** Espalhe em `<ResumoErros {...resumo.props} />`. */
  props: PropsResumoErros;
  /** Passe como `aoInvalidar` de `handleSubmit(aoValido, resumo.aoInvalidar)`. */
  aoInvalidar: (erros: FieldErrors<Form>) => void;
  /** Esvazie no começo de cada envio. */
  limpar: () => void;
  /** Para `aplicarErroApi`. */
  definirResumo: (mensagens: string[]) => void;
  /** Para `aplicarErroApi`. */
  focarResumo: () => void;
}

/**
 * Estado do resumo de erros de um formulário. Fluxo: no envio, `limpar()`; se a validação local
 * falhar, `aoInvalidar` lista os campos com erro e põe o foco no resumo; se a API falhar,
 * `aplicarErroApi` reparte o erro e (com mensagem de resumo) pede o foco aqui.
 */
export function useResumoErros<Form extends FieldValues>({
  setFocus,
  aoTentarDeNovo,
  tentando = false,
}: OpcoesResumo<Form>): ControleResumo<Form> {
  const ref = useRef<View>(null);
  const [itens, setItens] = useState<ItemResumo[]>([]);
  const [mensagens, setMensagens] = useState<string[]>([]);
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0);

  // O foco só pode ir depois de o resumo existir na tela: o pedido vira um efeito do render seguinte.
  useEffect(() => {
    if (pedidosDeFoco > 0) moverFoco(ref);
  }, [pedidosDeFoco]);

  const focarResumo = useCallback(() => setPedidosDeFoco((n) => n + 1), []);
  const limpar = useCallback(() => {
    setItens([]);
    setMensagens([]);
  }, []);
  const definirResumo = useCallback((novas: string[]) => setMensagens(novas), []);
  const aoInvalidar = useCallback(
    (erros: FieldErrors<Form>) => {
      setItens(itensDeErros(erros));
      setMensagens([]);
      focarResumo();
    },
    [focarResumo],
  );

  return {
    props: {
      ref,
      itens,
      mensagens,
      aoFocarCampo: (campo) => setFocus(campo as Path<Form>),
      aoTentarDeNovo: mensagens.includes(MENSAGEM_FALHA) ? aoTentarDeNovo : undefined,
      tentando,
    },
    aoInvalidar,
    limpar,
    definirResumo,
    focarResumo,
  };
}

/**
 * Ignora um novo envio enquanto o anterior não terminou (CT-01: clique duplo, Enter + clique,
 * duas teclas = 1 requisição). O `Botao` já faz isso para o toque; isto cobre o Enter.
 */
export function useEnvioUnico<Args extends unknown[]>(
  enviar: (...args: Args) => unknown,
): (...args: Args) => Promise<void> {
  const emVoo = useRef(false);
  const ultimo = useRef(enviar);
  useEffect(() => {
    ultimo.current = enviar;
  }, [enviar]);

  return useCallback(async (...args: Args) => {
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      await ultimo.current(...args);
    } finally {
      emVoo.current = false;
    }
  }, []);
}
