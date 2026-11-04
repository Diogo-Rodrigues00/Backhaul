// Conversa da proposta (card 042, ADR 0016): histórico + campo de envio entre a empresa e o motorista.
// Apresentacional: não busca nem envia nada. A tela (`PainelDaConversa`, que usa
// `useConversaDaProposta`) entrega as mensagens e faz o envio (ADR 0003). Serve às duas telas
// (empresa em "Propostas da carga", motorista em "Minhas propostas"). Chega ao app por React.lazy na
// primeira abertura (`src/telas/PainelDaConversa.carregar.ts`), por isso fica fora do JS inicial.
//
// O anúncio de mensagem nova NÃO é feito aqui: a lista é `role="list"`, não `role="log"`, e quem
// anuncia é a tela, pela região viva global (só as mensagens da outra parte, ADR 0016).
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type Text, type TextInput, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Carregando } from '@/components/atoms/Carregando';
import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { moverFoco } from '@/lib/a11y';
import { formatarDataHora } from '@/lib/formatacao';
import { MENSAGEM_MAXIMO_CARACTERES, validarMensagem } from '@/lib/mensagem';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

/** Uma mensagem como a API devolve (`GET /propostas/:id/mensagens`). */
export interface MensagemDaConversa {
  id: string;
  /** Id do USUÁRIO que escreveu, o mesmo de `usuario.id` da sessão. */
  remetente_id: string;
  texto: string;
  /** ISO. */
  criado_em: string;
}

export const MOTIVO_CONVERSA_ENCERRADA =
  'Esta proposta foi encerrada. Você ainda pode ler a conversa.';
export const ROTULO_ABRIR_CONVERSA = 'Abrir conversa';
export const ROTULO_FECHAR_CONVERSA = 'Fechar conversa';

export interface PropsConversaDaProposta {
  /** Histórico em ordem cronológica. `undefined` enquanto a primeira leitura não terminou. */
  mensagens: readonly MensagemDaConversa[] | undefined;
  /** `usuario.id` da sessão (GET /eu). `null` ainda não se sabe: nenhuma mensagem vira "Você". */
  meuUsuarioId: string | null;
  /** Nome de quem está do outro lado: o motorista (empresa) ou a empresa (motorista). */
  nomeDaOutraParte: string;
  /** Proposta recusada/expirada: histórico legível, campo e botão desligados com o motivo em texto. */
  encerrada: boolean;
  /** Primeira leitura em andamento. */
  carregando?: boolean;
  /** Falha ao ler o histórico (404, 500, rede): aparece dentro da conversa com "Tentar de novo". */
  erroDeCarga?: string;
  aoTentarDeNovo?: () => void | Promise<unknown>;
  tentandoDeNovo?: boolean;
  /** Enviando: o botão mostra o progresso e o campo fica só para leitura (não perde o foco). */
  enviando: boolean;
  /** Erro da API (400, 5xx, rede) para mostrar no campo. */
  erroDoCampo?: string;
  /**
   * Recebe o texto já validado e sem espaços nas pontas. Devolve `true` quando a API aceitou (o campo
   * é limpo) e `false` quando recusou (o texto fica no campo para a pessoa corrigir).
   */
  aoEnviar: (texto: string) => Promise<boolean>;
  /** A pessoa mexeu no texto: a tela apaga o `erroDoCampo` da tentativa anterior. */
  aoMudarTexto?: () => void;
  /** `id` da raiz, para o botão que abre a conversa apontar com `aria-controls`. */
  id?: string;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    raiz: { gap: space[4], minWidth: 0 } satisfies ViewStyle,
    titulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    } satisfies ViewStyle,
    historico: { maxHeight: 340, flexGrow: 0 } satisfies ViewStyle,
    historicoConteudo: { padding: space[3] } satisfies ViewStyle,
    historicoCaixa: {
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    lista: { gap: space[3] } satisfies ViewStyle,
    mensagem: { maxWidth: '84%', gap: space[1] } satisfies ViewStyle,
    minha: { alignSelf: 'flex-end', alignItems: 'flex-end' } satisfies ViewStyle,
    dela: { alignSelf: 'flex-start', alignItems: 'flex-start' } satisfies ViewStyle,
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
      alignItems: 'center',
    } satisfies ViewStyle,
    balao: {
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    vazio: {
      alignItems: 'center',
      gap: space[2],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    textoCentral: { textAlign: 'center', maxWidth: 440 } as const,
    formulario: { gap: space[3] } satisfies ViewStyle,
  } as const;
}

function Mensagem({
  mensagem,
  minha,
  autor,
}: {
  mensagem: MensagemDaConversa;
  minha: boolean;
  autor: string;
}) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  // O lado e a cor só reforçam; quem escreveu e a hora estão sempre em texto (D-PO-13).
  return (
    <View role="listitem" style={[estilos.mensagem, minha ? estilos.minha : estilos.dela]}>
      <View style={estilos.meta}>
        <Texto nivel="sm" peso="bold">
          {autor}
        </Texto>
        <Texto nivel="sm" cor="secundario">
          {formatarDataHora(mensagem.criado_em)}
        </Texto>
      </View>
      <View
        style={[
          estilos.balao,
          minha
            ? { backgroundColor: colors.bg.highlight, borderColor: colors.text.primary }
            : { backgroundColor: colors.bg.surface, borderColor: colors.border.control },
        ]}
      >
        <Texto>{mensagem.texto}</Texto>
      </View>
    </View>
  );
}

/**
 * Conversa de uma proposta: título `h4` "Conversa com <nome>", histórico (`role="list"`, autor em
 * texto "Você"/nome e hora), estado vazio, campo "Mensagem" com contador "N de 1000 caracteres"
 * ligado como ajuda, e "Enviar". O foco vai ao título ao montar (a conversa acabou de abrir); o
 * envio com sucesso limpa o campo e devolve o foco a ele, e com erro mantém o texto e o foco no campo.
 */
export function ConversaDaProposta({
  mensagens,
  meuUsuarioId,
  nomeDaOutraParte,
  encerrada,
  carregando = false,
  erroDeCarga,
  aoTentarDeNovo,
  tentandoDeNovo = false,
  enviando,
  erroDoCampo,
  aoEnviar,
  aoMudarTexto,
  id,
}: PropsConversaDaProposta) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const refTitulo = useRef<Text>(null);
  const refCampo = useRef<TextInput>(null);
  const refRolagem = useRef<ScrollView>(null);
  const [texto, setTexto] = useState('');
  const [erroLocal, setErroLocal] = useState<string | undefined>();
  const idDoTitulo = `${id ?? 'conversa'}-titulo`;

  // A conversa acaba de abrir: o foco vai ao título, para o leitor de tela dizer onde está.
  useEffect(() => {
    moverFoco(refTitulo);
  }, []);

  // Histórico no fim: ao abrir e quando a última mensagem é minha (acabei de enviar).
  const total = mensagens?.length ?? 0;
  const ultima = total > 0 ? mensagens?.[total - 1] : undefined;
  const ultimaEMinha = ultima !== undefined && ultima.remetente_id === meuUsuarioId;
  const rolouAoAbrir = useRef(false);
  useEffect(() => {
    if (total === 0) return;
    if (!rolouAoAbrir.current || ultimaEMinha) refRolagem.current?.scrollToEnd({ animated: false });
    rolouAoAbrir.current = true;
  }, [total, ultimaEMinha]);

  const enviar = async () => {
    const resultado = validarMensagem(texto);
    if (!resultado.ok) {
      setErroLocal(resultado.erro);
      moverFoco(refCampo);
      return;
    }
    setErroLocal(undefined);
    const aceita = await aoEnviar(resultado.texto);
    if (aceita) setTexto('');
    moverFoco(refCampo);
  };

  const mostrarCampo = mensagens !== undefined;
  const ajuda = encerrada
    ? MOTIVO_CONVERSA_ENCERRADA
    : `${texto.length} de ${MENSAGEM_MAXIMO_CARACTERES} caracteres`;

  let historico;
  if (erroDeCarga !== undefined) {
    historico = (
      <EstadoErro
        mensagem={erroDeCarga}
        aoTentarDeNovo={aoTentarDeNovo ?? (() => undefined)}
        tentando={tentandoDeNovo}
      />
    );
  } else if (carregando || mensagens === undefined) {
    historico = <Carregando texto="Carregando a conversa…" />;
  } else if (mensagens.length === 0) {
    historico = (
      <View style={[estilos.vazio, { borderColor: colors.border.subtle }]}>
        <Icone nome="message-square" tamanho="destaque" cor={colors.text.secondary} />
        <Texto peso="bold">Nenhuma mensagem ainda</Texto>
        <Texto nivel="sm" cor="secundario" style={estilos.textoCentral}>
          {encerrada
            ? 'Esta conversa não teve mensagens.'
            : 'Comece a conversa. Combine o horário da coleta, o local de descarga ou tire dúvidas sobre a carga.'}
        </Texto>
      </View>
    );
  } else {
    historico = (
      <ScrollView
        ref={refRolagem}
        role="region"
        aria-label={`Mensagens da conversa com ${nomeDaOutraParte}`}
        tabIndex={0}
        style={[
          estilos.historico,
          estilos.historicoCaixa,
          { backgroundColor: colors.bg.sunken, borderColor: colors.border.subtle },
        ]}
        contentContainerStyle={estilos.historicoConteudo}
      >
        <View role="list" style={estilos.lista}>
          {mensagens.map((mensagem) => {
            const minha = meuUsuarioId !== null && mensagem.remetente_id === meuUsuarioId;
            return (
              <Mensagem
                key={mensagem.id}
                mensagem={mensagem}
                minha={minha}
                autor={minha ? 'Você' : nomeDaOutraParte}
              />
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <View nativeID={id} role="group" aria-labelledby={idDoTitulo} style={estilos.raiz}>
      <View style={estilos.titulo}>
        <Icone nome="message-square" cor={colors.text.primary} />
        <Titulo ref={refTitulo} nivel={4} nativeID={idDoTitulo} tabIndex={-1}>
          {`Conversa com ${nomeDaOutraParte}`}
        </Titulo>
      </View>

      {historico}

      {mostrarCampo && erroDeCarga === undefined ? (
        <View style={estilos.formulario}>
          <CampoTexto
            ref={refCampo}
            rotulo="Mensagem"
            ajuda={ajuda}
            erro={erroLocal ?? erroDoCampo}
            multiline
            numberOfLines={3}
            value={texto}
            onChangeText={(novo) => {
              setTexto(novo);
              setErroLocal(undefined);
              aoMudarTexto?.();
            }}
            desabilitado={encerrada}
            readOnly={enviando}
            autoComplete="off"
          />
          <Botao
            icone="send"
            carregando={enviando}
            rotuloCarregando="Enviando…"
            desabilitado={encerrada}
            aoPressionar={enviar}
          >
            Enviar
          </Botao>
        </View>
      ) : null}
    </View>
  );
}
