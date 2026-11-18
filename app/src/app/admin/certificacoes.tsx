import { ConteudoLista } from '@/components/templates/TemplateLista';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoCertificacoesPendentes } from '@/telas/CorpoCertificacoesPendentes.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Aprovações do admin (MVP-20, card 032). Só a casca (h1, cabeçalho, abas) fica no JS inicial da
// rota: a fila e o diálogo carregam por React.lazy logo depois, junto com o cliente de dados (ADR
// 0011 e ADR 0004, adendo). Título e frase fixos: estão no HTML estático.
export default function AprovacoesDeCertificacoes() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Aprovações"
      descricao="Aprove ou recuse as certificações que os motoristas enviaram."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoCertificacoesPendentes}
        carregando={
          <ConteudoLista
            estado="carregando"
            textoCarregando="Carregando certificações pendentes…"
          />
        }
      />
    </TemplateTela>
  );
}
