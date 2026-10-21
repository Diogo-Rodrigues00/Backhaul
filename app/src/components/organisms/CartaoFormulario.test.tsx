import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CartaoFormulario, CelulaFormulario } from './CartaoFormulario';

function formularios() {
  return screen.container.queryAll((el) => el.props.role === 'form');
}

describe('CartaoFormulario', () => {
  it('é um formulário com nome acessível', async () => {
    await renderizar(
      <CartaoFormulario nome="Cadastro de motorista" acoes={<Text>Salvar</Text>}>
        <CelulaFormulario>
          <Text>campo</Text>
        </CelulaFormulario>
      </CartaoFormulario>,
    );
    const [formulario] = formularios();
    expect(formularios()).toHaveLength(1);
    expect(formulario?.props['aria-label']).toBe('Cadastro de motorista');
    expect(formulario?.props.accessibilityLabel).toBe('Cadastro de motorista');
  });

  it('mostra o resumo no topo, os campos e as ações no rodapé, nessa ordem', async () => {
    await renderizar(
      <CartaoFormulario nome="Entrar" resumo={<Text>RESUMO</Text>} acoes={<Text>AÇÕES</Text>}>
        <CelulaFormulario>
          <Text>CAMPO</Text>
        </CelulaFormulario>
      </CartaoFormulario>,
    );
    const textos = screen.getAllByText(/RESUMO|CAMPO|AÇÕES/).map((t) => t.props.children);
    expect(textos).toEqual(['RESUMO', 'CAMPO', 'AÇÕES']);
  });

  it('as colunas empilham por flex-wrap (sem JavaScript): células de base fixa que crescem', async () => {
    await renderizar(
      <CartaoFormulario nome="Entrar" acoes={<Text>ok</Text>}>
        <CelulaFormulario>
          <Text>A</Text>
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Text>B</Text>
        </CelulaFormulario>
      </CartaoFormulario>,
    );
    const grade = screen.getByText('A').parent?.parent;
    expect(StyleSheet.flatten(grade?.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
    });
    const meia = StyleSheet.flatten(screen.getByText('A').parent?.props.style);
    const cheia = StyleSheet.flatten(screen.getByText('B').parent?.props.style);
    expect(meia).toMatchObject({ flexGrow: 1, flexShrink: 1, flexBasis: 304 });
    expect(cheia.flexBasis).toBe('100%');
  });

  it('as ações ficam à direita', async () => {
    await renderizar(
      <CartaoFormulario nome="Entrar" acoes={<Text>Entrar</Text>}>
        <CelulaFormulario>
          <Text>A</Text>
        </CelulaFormulario>
      </CartaoFormulario>,
    );
    const rodape = screen.getByText('Entrar').parent;
    expect(StyleSheet.flatten(rodape?.props.style)).toMatchObject({
      flexDirection: 'row',
      justifyContent: 'flex-end',
    });
  });
});
