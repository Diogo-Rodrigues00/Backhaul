// Conversa da proposta (card 042, ADR 0016): histórico + campo de envio entre a empresa e o motorista.
// Apresentacional: não busca nem envia nada. A tela (`PainelDaConversa`, que usa
// `useConversaDaProposta`) entrega as mensagens e faz o envio (ADR 0003). Serve às duas telas
// (empresa em "Propostas da carga", motorista em "Minhas propostas"). Chega ao app por React.lazy na
// primeira abertura (`src/telas/PainelDaConversa.carregar.ts`), por isso fica fora do JS inicial.
//
// O anúncio de mensagem nova NÃO é feito aqui: a lista é `role="list"`, não `role="log"`, e quem
// anuncia é a tela, pela região viva global (só as mensagens da outra parte, ADR 0016).
import { useEffect, useRef, useState, type Ref } from 'react';
import {
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type Text,
  type TextInput,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Carregando } from '@/components/atoms/Carregando';
import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { moverFoco } from '@/lib/a11y';
import { formatarDataHora } from '@/lib/formatacao';
import { ERRO_MENSAGEM_LONGA, MENSAGEM_MAXIMO_CARACTERES, validarMensagem } from '@/lib/mensagem';
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
/** Até aqui do fim do histórico a pessoa ainda "está no fim": mensagem nova rola sozinha. */
export const DISTANCIA_DO_FIM_PX = 48;

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

/**
 * Texto sem espaços (300 "k" seguidos passa no filtro) não pode estourar o balão nem a tela de
 * 320 px (WCAG 1.4.10): na web `overflow-wrap: anywhere` também reduz a largura mínima do conteúdo,
 * coisa que o `word-wrap: break-word` do react-native-web não faz. No iPhone o texto já quebra.
 */
const QUEBRA_ONDE_PRECISAR: TextStyle | undefined = Platform.select({
  // `wordWrap` também: é a chave que o react-native-web já usa (`break-word`) e a nossa a substitui.
  web: { overflowWrap: 'anywhere', wordWrap: 'anywhere' } as unknown as TextStyle,
});

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    raiz: { gap: space[4], minWidth: 0 } satisfies ViewStyle,
    tituloTexto: { flexShrink: 1, minWidth: 0 } satisfies TextStyle,
    titulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    } satisfies ViewStyle,
    historicoBloco: { gap: space[2], alignItems: 'stretch' } satisfies ViewStyle,
    verNova: { alignItems: 'flex-start' } satisfies ViewStyle,
    historico: { maxHeight: 340, flexGrow: 0 } satisfies ViewStyle,
    historicoConteudo: { padding: space[3] } satisfies ViewStyle,
    historicoCaixa: {
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    lista: { gap: space[3] } satisfies ViewStyle,
    mensagem: { maxWidth: '84%', minWidth: 0, gap: space[1] } satisfies ViewStyle,
    minha: { alignSelf: 'flex-end', alignItems: 'flex-end' } satisfies ViewStyle,
    dela: { alignSelf: 'flex-start', alignItems: 'flex-start' } satisfies ViewStyle,
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
      alignItems: 'center',
    } satisfies ViewStyle,
    balao: {
      minWidth: 0,
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
  refItem,
}: {
  mensagem: MensagemDaConversa;
  minha: boolean;
  autor: string;
  /** A última mensagem recebe o foco do VoiceOver depois de "Ver nova mensagem". */
  refItem?: Ref<View>;
}) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const web = Platform.OS === 'web';
  const hora = formatarDataHora(mensagem.criado_em);
  // O lado e a cor só reforçam; quem escreveu e a hora estão sempre em texto (D-PO-13). No iPhone a
  // mensagem é um elemento só ("Você, 04/11/2026 14:00: texto"); na web cada texto é lido como está.
  return (
    <View
      ref={refItem}
      role="listitem"
      accessible={!web}
      accessibilityLabel={web ? undefined : `${autor}, ${hora}: ${mensagem.texto}`}
      style={[estilos.mensagem, minha ? estilos.minha : estilos.dela]}
    >
      <View style={estilos.meta}>
        <Texto nivel="sm" peso="bold" style={QUEBRA_ONDE_PRECISAR}>
          {autor}
        </Texto>
        <Texto nivel="sm" cor="secundario">
          {hora}
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
        <Texto style={QUEBRA_ONDE_PRECISAR}>{mensagem.texto}</Texto>
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
  const refUltima = useRef<View>(null);
  const [texto, setTexto] = useState('');
  const [erroLocal, setErroLocal] = useState<string | undefined>();
  const idDoTitulo = `${id ?? 'conversa'}-titulo`;

  // A conversa acaba de abrir: o foco vai ao título, para o leitor de tela dizer onde está. Na web só
  // se o foco ainda estiver no botão que abriu (a pessoa pode já ter ido para outro lugar enquanto o
  // código da conversa chegava); no iPhone sempre.
  useEffect(() => {
    if (Platform.OS === 'web' && id !== undefined) {
      const ativo = typeof document === 'undefined' ? null : document.activeElement;
      if (ativo?.getAttribute('aria-controls') !== id) return;
    }
    moverFoco(refTitulo);
  }, [id]);

  // A proposta foi encerrada com a conversa aberta (409 ao enviar): o campo e o botão se desligam e
  // o foco, que estava neles, iria para o corpo da página. Vai ao título (WCAG 2.4.3).
  const estavaEncerrada = useRef(encerrada);
  useEffect(() => {
    if (encerrada && !estavaEncerrada.current) moverFoco(refTitulo);
    estavaEncerrada.current = encerrada;
  }, [encerrada]);

  // Rolagem do histórico. Mensagem nova com a pessoa perto do fim (≤ 48 px) rola ao fim sozinha; se
  // ela subiu para reler, o histórico não se mexe e aparece "Ver nova mensagem". A mensagem que eu
  // acabo de enviar sempre leva ao fim. O anúncio da mensagem nova é da região viva global (ADR 0016).
  const total = mensagens?.length ?? 0;
  const ultima = total > 0 ? mensagens?.[total - 1] : undefined;
  const ultimaEMinha = ultima !== undefined && ultima.remetente_id === meuUsuarioId;
  const [seguindo, setSeguindo] = useState(true);
  const [vistoAte, setVistoAte] = useState<number | null>(null);
  const acompanhar = seguindo || ultimaEMinha;
  const novas = acompanhar || vistoAte === null ? 0 : Math.max(0, total - vistoAte);

  const aoRolar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = evento.nativeEvent;
    const noFim =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) <= DISTANCIA_DO_FIM_PX;
    setSeguindo(noFim);
    // Visto até aqui: o total de quando a pessoa chegou ao fim, ou de quando saiu dele.
    setVistoAte((visto) => (noFim ? total : (visto ?? total)));
  };
  const aoCrescer = () => {
    if (acompanhar) refRolagem.current?.scrollToEnd({ animated: false });
  };
  const verNova = () => {
    setSeguindo(true);
    setVistoAte(total);
    refRolagem.current?.scrollToEnd({ animated: false });
    // O botão some ao ser usado: o foco vai ao histórico (web) ou à última mensagem (VoiceOver),
    // em vez de cair no corpo da página (WCAG 2.4.3).
    moverFoco(Platform.OS === 'web' ? refRolagem : refUltima);
  };

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
  // Passou do limite: erro com ícone e texto (não só a cor), sem esperar o envio. Não é região viva.
  // O contador conta o mesmo que a validação e o backend medem: o texto sem espaços nas pontas.
  const tamanho = texto.trim().length;
  const passouDoLimite = tamanho > MENSAGEM_MAXIMO_CARACTERES;
  const erroDoTexto =
    erroLocal ?? erroDoCampo ?? (passouDoLimite ? ERRO_MENSAGEM_LONGA : undefined);
  const ajuda = encerrada
    ? MOTIVO_CONVERSA_ENCERRADA
    : `${tamanho} de ${MENSAGEM_MAXIMO_CARACTERES} caracteres`;

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
      <View style={estilos.historicoBloco}>
        <ScrollView
          ref={refRolagem}
          role="region"
          aria-label={`Mensagens da conversa com ${nomeDaOutraParte}`}
          tabIndex={0}
          scrollEventThrottle={100}
          onScroll={aoRolar}
          onContentSizeChange={aoCrescer}
          style={[
            estilos.historico,
            estilos.historicoCaixa,
            { backgroundColor: colors.bg.sunken, borderColor: colors.border.subtle },
          ]}
          contentContainerStyle={estilos.historicoConteudo}
        >
          <View role="list" style={estilos.lista}>
            {mensagens.map((mensagem, indice) => {
              const minha = meuUsuarioId !== null && mensagem.remetente_id === meuUsuarioId;
              return (
                <Mensagem
                  key={mensagem.id}
                  mensagem={mensagem}
                  minha={minha}
                  autor={minha ? 'Você' : nomeDaOutraParte}
                  refItem={indice === mensagens.length - 1 ? refUltima : undefined}
                />
              );
            })}
          </View>
        </ScrollView>
        {novas > 0 ? (
          <View style={estilos.verNova}>
            <Botao variante="secundario" icone="message-square" aoPressionar={verNova}>
              {novas === 1 ? 'Ver nova mensagem' : 'Ver novas mensagens'}
            </Botao>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View nativeID={id} role="group" aria-labelledby={idDoTitulo} style={estilos.raiz}>
      <View style={estilos.titulo}>
        <Icone nome="message-square" cor={colors.text.primary} />
        <Titulo
          ref={refTitulo}
          nivel={4}
          nativeID={idDoTitulo}
          tabIndex={-1}
          style={[estilos.tituloTexto, QUEBRA_ONDE_PRECISAR]}
        >
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
            erro={erroDoTexto}
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
