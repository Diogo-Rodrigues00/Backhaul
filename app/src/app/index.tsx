import { Cabecalho } from '@/components/organisms/Cabecalho';
import { TemplateTela } from '@/components/templates/TemplateTela';

// Tela provisória: a apresentação com "Entrar" e "Criar conta" chega nos cards de login e cadastro.
// O h1 e a descrição ficam no HTML estático (LCP, ADR 0011).
export default function Inicio() {
  return (
    <TemplateTela
      titulo="Backhaul"
      tituloDaPagina="Backhaul"
      descricao="Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas."
      cabecalho={<Cabecalho variante="simples" />}
    />
  );
}
