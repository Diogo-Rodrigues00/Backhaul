import { Botao } from '@/components/atoms/Botao';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { useSessao } from '@/state/sessao/useSessao';

// D-PO-10: o administrador não tem telas nesta versão; só pode sair.
export default function Administrador() {
  const { cabecalho, abas } = useCasca();
  const { sair } = useSessao();
  return (
    <TemplateTela
      titulo="Perfil de administrador sem telas nesta versão"
      tituloDaPagina="Administrador · Backhaul"
      descricao="Esta versão do Backhaul não tem telas para o administrador. Use Sair para entrar com outra conta."
      cabecalho={cabecalho}
      abas={abas}
    >
      <Botao
        variante="secundario"
        aoPressionar={() => {
          void sair();
        }}
      >
        Sair
      </Botao>
    </TemplateTela>
  );
}
