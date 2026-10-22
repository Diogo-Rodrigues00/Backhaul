import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';

// Tela provisória (card 013): só a casca da área. O card 020 a substitui pela lista de cargas.
export default function MinhasCargas() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Minhas cargas"
      descricao="As cargas que você publicou e as propostas que chegaram."
      cabecalho={cabecalho}
      abas={abas}
    />
  );
}
