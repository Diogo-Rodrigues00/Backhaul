import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';

import { DivisorEstrada } from '@/components/atoms/DivisorEstrada';
import { Link } from '@/components/atoms/Link';
import { Cabecalho } from '@/components/organisms/Cabecalho';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { liberarPaginaInicial } from '@/lib/paginaInicial';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import { useSessao } from '@/state/sessao/useSessao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Página inicial pública: a marca está no cabeçalho, o h1 é a frase do produto (a mesma do painel do
// login) e os dois botões grandes levam a "Entrar" e "Criar conta". O h1 e a descrição ficam no HTML
// estático (LCP, ADR 0011). Só usa componentes que as demais telas já carregam: o JS inicial não cresce.
const LARGURA_BOTAO = 240;

function criarEstilos({ space }: TemaVisual) {
  return {
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] } satisfies ViewStyle,
    // `flexBasis` + `flexGrow`: lado a lado quando cabe, empilhados e de largura cheia no celular.
    acao: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: LARGURA_BOTAO,
      maxWidth: 360,
      minWidth: 0,
    } satisfies ViewStyle,
    estrada: { width: '100%', maxWidth: 360 } satisfies ViewStyle,
  } as const;
}

export default function Inicio() {
  const estilos = useEstilos(criarEstilos);
  const { estado } = useSessao();
  // Com sessão autenticada abre a área do perfil (depois de restaurar a sessão, em efeito).
  useRedirecionarSeAutenticado();
  // Quem tem token guardado não vê a apresentação enquanto a sessão é conferida (+html.tsx); se a
  // sessão não vingar, ela aparece. Autenticado: continua escondida até o redirecionamento.
  useEffect(() => {
    if (estado === 'anonimo') liberarPaginaInicial();
  }, [estado]);
  // Sem cleanup de propósito: o portão do servidor desmonta a home (tela "Conectando") e a remonta
  // quando o servidor volta; a marca precisa continuar até a sessão ser conferida. O CSS só esconde o
  // `#conteudo` que contém `data-inicio`, então a marca esquecida no <html> não afeta as outras telas.

  return (
    <TemplateTela
      titulo="A urgência decide quem sai na frente"
      tituloDaPagina="Backhaul · A urgência decide quem sai na frente"
      descricao="Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas."
      cabecalho={<Cabecalho variante="simples" />}
    >
      <View role="group" aria-label="Como começar" dataSet={{ inicio: '1' }} style={estilos.acoes}>
        <View style={estilos.acao}>
          <Link
            href="/entrar"
            variante="botao"
            aparencia={{ variante: 'primario', tamanho: 'lg', bloco: true, icone: 'arrow-right' }}
          >
            Entrar
          </Link>
        </View>
        <View style={estilos.acao}>
          <Link
            href="/cadastro"
            variante="botao"
            aparencia={{ variante: 'secundario', tamanho: 'lg', bloco: true }}
          >
            Criar conta
          </Link>
        </View>
      </View>
      <View style={estilos.estrada}>
        <DivisorEstrada variante="cinza" />
      </View>
    </TemplateTela>
  );
}
