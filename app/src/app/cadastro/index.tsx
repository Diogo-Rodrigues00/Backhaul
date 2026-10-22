import type { Href } from 'expo-router';
import { View, type ViewStyle } from 'react-native';

import { Link } from '@/components/atoms/Link';
import { TemplateFormulario } from '@/components/templates/TemplateFormulario';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Escolha do perfil antes do cadastro (MVP-05/06). Dois alvos grandes, cada um um link com nome claro.
// `/cadastro/motorista` é do card 017: até ele entrar, o link leva ao "não encontrada" do expo-router.
const ROTA_MOTORISTA = '/cadastro/motorista' as Href;
const ROTA_EMPRESA: Href = '/cadastro/empresa';
const ROTA_ENTRAR = '/entrar' as Href;

function criarEstilos({ space }: TemaVisual) {
  return {
    escolhas: { gap: space[4] } satisfies ViewStyle,
    entrar: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] } satisfies ViewStyle,
  } as const;
}

export default function CadastroEscolha() {
  // Com sessão autenticada abre a área do perfil (ADR 0006); o HTML estático não muda.
  useRedirecionarSeAutenticado();
  const estilos = useEstilos(criarEstilos);

  return (
    <TemplateFormulario titulo="Criar conta" descricao="Escolha como você vai usar o Backhaul.">
      <View style={estilos.escolhas}>
        <Link
          href={ROTA_MOTORISTA}
          variante="botao"
          aparencia={{ variante: 'primario', tamanho: 'lg', bloco: true, icone: 'arrow-right' }}
        >
          Sou motorista
        </Link>
        <Link
          href={ROTA_EMPRESA}
          variante="botao"
          aparencia={{ variante: 'primario', tamanho: 'lg', bloco: true, icone: 'arrow-right' }}
        >
          Sou empresa
        </Link>
      </View>
      <View style={estilos.entrar}>
        <Link href={ROTA_ENTRAR}>Já tenho conta</Link>
      </View>
    </TemplateFormulario>
  );
}
