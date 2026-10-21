import { fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { AccessibilityInfo, type View } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ResumoErros, tituloDoResumo } from './ResumoErros';

function alertas() {
  return screen.container.queryAll((el) => el.props.role === 'alert');
}

describe('ResumoErros', () => {
  it('sem itens e sem mensagens não aparece', async () => {
    await renderizar(<ResumoErros aoFocarCampo={() => {}} />);
    expect(alertas()).toHaveLength(0);
    expect(screen.queryByText(/Corrija/)).not.toBeOnTheScreen();
  });

  it('é um alerta que pode receber foco por código (tabIndex -1)', async () => {
    await renderizar(
      <ResumoErros
        itens={[{ campo: 'cpf', mensagem: 'Informe 11 dígitos.' }]}
        aoFocarCampo={() => {}}
      />,
    );
    const [resumo] = alertas();
    expect(resumo?.props.tabIndex).toBe(-1);
  });

  it('o ref aponta para o resumo (para o foco depois do envio)', async () => {
    const ref = createRef<View>();
    await renderizar(
      <ResumoErros
        ref={ref}
        itens={[{ campo: 'cpf', mensagem: 'Informe 11 dígitos.' }]}
        aoFocarCampo={() => {}}
      />,
    );
    expect(ref.current).not.toBeNull();
  });

  it('"Corrija N campos para continuar." e um link por campo com o erro', async () => {
    await renderizar(
      <ResumoErros
        itens={[
          { campo: 'email', mensagem: 'Informe um e-mail válido.' },
          { campo: 'cpf', mensagem: 'Informe 11 dígitos.' },
          { campo: 'senha', mensagem: 'Use pelo menos 8 caracteres.' },
        ]}
        aoFocarCampo={() => {}}
      />,
    );
    expect(screen.getByText('Corrija 3 campos para continuar.')).toBeOnTheScreen();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Informe 11 dígitos.' })).toBeOnTheScreen();
  });

  it('com um campo só, o título fica no singular', async () => {
    expect(tituloDoResumo(1)).toBe('Corrija 1 campo para continuar.');
    expect(tituloDoResumo(2)).toBe('Corrija 2 campos para continuar.');
  });

  it('tocar no link leva o foco ao campo', async () => {
    const aoFocarCampo = jest.fn();
    await renderizar(
      <ResumoErros
        itens={[
          { campo: 'email', mensagem: 'Informe um e-mail válido.' },
          { campo: 'cpf', mensagem: 'Informe 11 dígitos.' },
        ]}
        aoFocarCampo={aoFocarCampo}
      />,
    );
    await fireEvent.press(screen.getByRole('link', { name: 'Informe 11 dígitos.' }));
    expect(aoFocarCampo).toHaveBeenCalledWith('cpf');
  });

  it('uma mensagem sem campo aparece como texto simples, sem título de "Corrija"', async () => {
    await renderizar(<ResumoErros mensagens={['E-mail já cadastrado']} aoFocarCampo={() => {}} />);
    expect(screen.getByText('E-mail já cadastrado')).toBeOnTheScreen();
    expect(screen.queryByText(/Corrija/)).not.toBeOnTheScreen();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('várias mensagens viram uma lista; junto de campos, vêm depois deles', async () => {
    await renderizar(
      <ResumoErros
        itens={[{ campo: 'cpf', mensagem: 'cpf deve ter 11 dígitos' }]}
        mensagens={['erro geral', 'outro erro']}
        aoFocarCampo={() => {}}
      />,
    );
    expect(screen.getByText('Corrija 1 campo para continuar.')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'listitem')).toHaveLength(3);
    expect(screen.getByText('erro geral')).toBeOnTheScreen();
    expect(screen.getByText('outro erro')).toBeOnTheScreen();
  });

  it('"Tentar de novo" só aparece quando a tela passa a ação, e chama a ação', async () => {
    const aoTentarDeNovo = jest.fn();
    await renderizar(
      <>
        <ResumoErros mensagens={['Algo deu errado. Tente de novo.']} aoFocarCampo={() => {}} />
      </>,
    );
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeOnTheScreen();

    await renderizar(
      <ResumoErros
        mensagens={['Algo deu errado. Tente de novo.']}
        aoFocarCampo={() => {}}
        aoTentarDeNovo={aoTentarDeNovo}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('tentando: o botão vira "Tentando…" e ignora toques', async () => {
    const aoTentarDeNovo = jest.fn();
    await renderizar(
      <ResumoErros
        mensagens={['Algo deu errado. Tente de novo.']}
        aoFocarCampo={() => {}}
        aoTentarDeNovo={aoTentarDeNovo}
        tentando
      />,
    );
    const botao = screen.getByRole('button', { name: 'Tentando…' });
    expect(botao).toBeBusy();
    await fireEvent.press(botao);
    expect(aoTentarDeNovo).not.toHaveBeenCalled();
  });

  it('no iPhone anuncia o título e as mensagens (o VoiceOver não lê o alert sozinho)', async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await renderizar(
      <ResumoErros
        itens={[{ campo: 'cpf', mensagem: 'Informe 11 dígitos.' }]}
        aoFocarCampo={() => {}}
      />,
    );
    expect(anunciar).toHaveBeenCalledWith('Corrija 1 campo para continuar. Informe 11 dígitos.');
    anunciar.mockRestore();
  });
});
