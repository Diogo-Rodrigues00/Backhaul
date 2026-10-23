import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Link } from '@/components/atoms/Link';
import { TemplateAutenticacao } from '@/components/templates/TemplateAutenticacao';
import { liberarPaginaInicial } from '@/lib/sessaoNaInicial';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import { useSessao } from '@/state/sessao/useSessao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Página inicial pública: a marca e a frase do produto (painel do TemplateAutenticacao, o mesmo do
// login) e as duas portas de entrada. O h1 e a descrição ficam no HTML estático (LCP, ADR 0011).
const DESCRICAO = 'Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.';

function criarEstilos({ space }: TemaVisual) {
  return { acoes: { gap: space[3] } satisfies ViewStyle } as const;
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

  return (
    <TemplateAutenticacao
      titulo="Bem-vindo ao Backhaul"
      tituloDaPagina="Backhaul · A urgência decide quem sai na frente"
      descricao={DESCRICAO}
    >
      <View role="group" aria-label="Como começar" style={estilos.acoes}>
        <Link
          href="/entrar"
          variante="botao"
          aparencia={{ variante: 'primario', tamanho: 'lg', bloco: true, icone: 'arrow-right' }}
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          variante="botao"
          aparencia={{ variante: 'secundario', tamanho: 'lg', bloco: true }}
        >
          Criar conta
        </Link>
      </View>
    </TemplateAutenticacao>
  );
}
