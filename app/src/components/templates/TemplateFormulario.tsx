import type { Href } from 'expo-router';

import { Link } from '@/components/atoms/Link';
import { Cabecalho } from '@/components/organisms/Cabecalho';

import { TemplateTela, type PropsTemplateTela } from './TemplateTela';

export interface PropsTemplateFormulario extends Omit<
  PropsTemplateTela,
  'cabecalho' | 'acoes' | 'abas' | 'antesDoTitulo' | 'estreita'
> {
  /** Link para a tela anterior, acima do título ("Voltar ao login"). */
  voltar?: { href: Href; rotulo: string };
  /** O `CartaoFormulario`. */
  children: PropsTemplateTela['children'];
}

/**
 * Página de formulário das telas públicas (FormPageTemplate, DS 5.4): cabeçalho simples, página de
 * até 760 px, link "Voltar", `h1` com a descrição e o `CartaoFormulario`. Vem do `TemplateTela`,
 * então o `h1`, a descrição, o `<title>` e o landmark `main` já estão no HTML estático.
 */
export function TemplateFormulario({ voltar, children, ...tela }: PropsTemplateFormulario) {
  return (
    <TemplateTela
      {...tela}
      estreita
      cabecalho={<Cabecalho variante="simples" />}
      antesDoTitulo={
        voltar ? (
          <Link
            href={voltar.href}
            variante="botao"
            aparencia={{ variante: 'texto', icone: 'arrow-left' }}
          >
            {voltar.rotulo}
          </Link>
        ) : null
      }
    >
      {children}
    </TemplateTela>
  );
}
