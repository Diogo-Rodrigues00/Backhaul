import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';

// Tela provisória (card 013): só a casca da área. O card 024 a substitui pelas cargas próximas.
export default function CargasProximas() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Cargas próximas"
      descricao="Cargas abertas perto de você, das mais urgentes para as menos."
      cabecalho={cabecalho}
      abas={abas}
    />
  );
}
