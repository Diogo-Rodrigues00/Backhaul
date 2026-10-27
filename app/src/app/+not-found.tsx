import { Link } from '@/components/atoms/Link';
import { Cabecalho } from '@/components/organisms/Cabecalho';
import { TemplateTela } from '@/components/templates/TemplateTela';

export default function NaoEncontrada() {
  return (
    <TemplateTela
      titulo="Página não encontrada"
      descricao="O endereço que você abriu não existe ou foi movido."
      cabecalho={<Cabecalho variante="simples" />}
    >
      <Link href="/">Voltar para o início</Link>
    </TemplateTela>
  );
}
