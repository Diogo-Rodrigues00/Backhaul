/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// Os campos no DOM de verdade (jsdom + react-native-web), que é o que o navegador recebe: o
// `<input>` com `id`, `aria-labelledby`, `aria-describedby` e `aria-invalid`; o `<select>` rotulado
// do CampoSelecao; os `role="radio"` do GrupoOpcoes e o `<form>` do CartaoFormulario. O Jest roda
// como iPhone; aqui `react-native` vira o web.
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { CartaoFormulario, CelulaFormulario } from '../organisms/CartaoFormulario';

import { CampoNumero } from './CampoNumero';
import { CampoSelecao } from './CampoSelecao';
import { CampoSenha } from './CampoSenha';
import { CampoTexto } from './CampoTexto';
import { GrupoOpcoes } from './GrupoOpcoes';
import { ResumoErros } from './ResumoErros';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('./../../hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: () => false }));
jest.mock('@/components/atoms/Icone', () => jest.requireActual('@/components/atoms/Icone.web'));
jest.mock('@/lib/a11y', () => jest.requireActual('@/lib/a11y.web'));
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));
jest.mock('@react-native-picker/picker', () => ({
  Picker: jest.requireActual('@react-native-picker/picker/js/Picker.web').default,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function comTema(ui: ReactElement) {
  return (
    <TemaContext.Provider
      value={{
        ...montarTema('light'),
        preferencia: 'sistema',
        esquema: 'light',
        alternar: () => {},
        pronto: true,
      }}
    >
      {ui}
    </TemaContext.Provider>
  );
}

let raiz: ReturnType<typeof createRoot>;
let contêiner: HTMLDivElement;

async function montar(ui: ReactElement) {
  await act(async () => raiz.render(comTema(ui)));
}

function achar<T extends Element>(seletor: string): T {
  const el = contêiner.querySelector<T>(seletor);
  if (!el) throw new Error(`Não encontrado: ${seletor}`);
  return el;
}

/** Texto do elemento citado em `aria-labelledby` / `aria-describedby`. */
function textoDe(ids: string | null): string {
  return (ids ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

beforeEach(() => {
  contêiner = document.createElement('div');
  document.body.appendChild(contêiner);
  raiz = createRoot(contêiner);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contêiner.remove();
});

describe('CampoTexto na web', () => {
  it('<input> com id, rótulo por aria-labelledby, erro e ajuda por aria-describedby', async () => {
    await montar(
      <CampoTexto
        rotulo="CPF"
        id="cpf"
        ajuda="Pode digitar com ou sem pontos."
        erro="Informe 11 dígitos."
      />,
    );
    const campo = achar<HTMLInputElement>('input');
    expect(campo.id).toBe('cpf');
    expect(textoDe(campo.getAttribute('aria-labelledby'))).toBe('CPF');
    expect(textoDe(campo.getAttribute('aria-describedby'))).toBe(
      'Informe 11 dígitos. Pode digitar com ou sem pontos.',
    );
    expect(campo.getAttribute('aria-invalid')).toBe('true');
  });

  it('sem erro: aria-invalid é false e não há aria-describedby', async () => {
    await montar(<CampoTexto rotulo="Nome" id="nome" />);
    const campo = achar<HTMLInputElement>('input');
    expect(campo.getAttribute('aria-invalid')).toBe('false');
    expect(campo.hasAttribute('aria-describedby')).toBe(false);
  });

  it('autocomplete e inputmode chegam ao <input>', async () => {
    await montar(<CampoTexto rotulo="E-mail" autoComplete="email" inputMode="email" />);
    const campo = achar<HTMLInputElement>('input');
    expect(campo.getAttribute('autocomplete')).toBe('email');
    expect(campo.getAttribute('inputmode')).toBe('email');
  });
});

describe('CampoSenha na web', () => {
  it('type password alterna para text; o botão tem aria-pressed e nome', async () => {
    await montar(<CampoSenha rotulo="Senha" tipo="nova-senha" />);
    const campo = achar<HTMLInputElement>('input');
    expect(campo.type).toBe('password');
    expect(campo.getAttribute('autocomplete')).toBe('new-password');

    const botao = achar<HTMLElement>('[role="button"][aria-label="Mostrar senha"]');
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    await act(async () => botao.click());

    expect(achar<HTMLInputElement>('input').type).toBe('text');
    const ocultar = achar<HTMLElement>('[role="button"][aria-label="Ocultar senha"]');
    expect(ocultar.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('CampoNumero na web', () => {
  it('inputmode decimal e unidade escondida do leitor de tela', async () => {
    await montar(<CampoNumero rotulo="Peso (kg)" sufixo="kg" />);
    expect(achar<HTMLInputElement>('input').getAttribute('inputmode')).toBe('decimal');
    const sufixo = Array.from(contêiner.querySelectorAll('[aria-hidden="true"]')).find(
      (el) => el.textContent === 'kg',
    );
    expect(sufixo).toBeDefined();
  });
});

describe('CampoSelecao na web', () => {
  it('vira um <select> rotulado, com as opções e o erro associado', async () => {
    const aoMudar = jest.fn();
    await montar(
      <CampoSelecao
        rotulo="Certificação"
        id="cert"
        opcoes={[
          { valor: 'mopp', rotulo: 'MOPP' },
          { valor: 'adr', rotulo: 'ADR' },
        ]}
        valor=""
        textoVazio="Selecione"
        aoMudar={aoMudar}
        erro="Escolha uma certificação."
      />,
    );
    const seletor = achar<HTMLSelectElement>('select');
    expect(seletor.id).toBe('cert');
    expect(textoDe(seletor.getAttribute('aria-labelledby'))).toBe('Certificação');
    expect(textoDe(seletor.getAttribute('aria-describedby'))).toBe('Escolha uma certificação.');
    expect(seletor.getAttribute('aria-invalid')).toBe('true');
    expect(Array.from(seletor.options).map((o) => o.textContent)).toEqual([
      'Selecione',
      'MOPP',
      'ADR',
    ]);
  });

  it('escolher uma opção chama aoMudar com o valor', async () => {
    const aoMudar = jest.fn();
    await montar(
      <CampoSelecao
        rotulo="Certificação"
        opcoes={[
          { valor: 'mopp', rotulo: 'MOPP' },
          { valor: 'adr', rotulo: 'ADR' },
        ]}
        valor="mopp"
        aoMudar={aoMudar}
      />,
    );
    const seletor = achar<HTMLSelectElement>('select');
    expect(seletor.value).toBe('mopp');
    await act(async () => {
      seletor.value = 'adr';
      seletor.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(aoMudar).toHaveBeenCalledWith('adr');
  });
});

describe('GrupoOpcoes na web', () => {
  const opcoes = [
    { valor: 'normal', rotulo: 'Normal', urgencia: 'normal' as const },
    { valor: 'urgente', rotulo: 'Urgente', urgencia: 'urgente' as const },
    { valor: 'critico', rotulo: 'Crítico', urgencia: 'critico' as const },
  ];

  it('radiogroup com legenda e radios com aria-checked; só a marcada entra no Tab', async () => {
    await montar(
      <GrupoOpcoes legenda="Urgência" opcoes={opcoes} valor="urgente" aoMudar={() => {}} />,
    );
    const grupo = achar<HTMLElement>('[role="radiogroup"]');
    expect(textoDe(grupo.getAttribute('aria-labelledby'))).toBe('Urgência');
    const radios = Array.from(contêiner.querySelectorAll<HTMLElement>('[role="radio"]'));
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Normal',
      'Urgente',
      'Crítico',
    ]);
  });

  it('setas movem a escolha e o foco (como num grupo de rádios)', async () => {
    const aoMudar = jest.fn();
    await montar(
      <GrupoOpcoes legenda="Urgência" opcoes={opcoes} valor="urgente" aoMudar={aoMudar} />,
    );
    const marcada = achar<HTMLElement>('[role="radio"][aria-checked="true"]');
    await act(async () => marcada.focus());
    await act(async () => {
      marcada.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(aoMudar).toHaveBeenLastCalledWith('critico');

    await act(async () => {
      marcada.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(aoMudar).toHaveBeenLastCalledWith('normal');
  });
});

describe('CartaoFormulario na web', () => {
  it('é um <form> com nome; Enter (submit) é cancelado e repassado a aoEnviar', async () => {
    const aoEnviar = jest.fn();
    await montar(
      <CartaoFormulario nome="Cadastro de motorista" aoEnviar={aoEnviar} acoes={<span>ações</span>}>
        <CelulaFormulario>
          <CampoTexto rotulo="Nome" />
        </CelulaFormulario>
      </CartaoFormulario>,
    );
    const formulario = achar<HTMLFormElement>('form');
    expect(formulario.getAttribute('aria-label')).toBe('Cadastro de motorista');

    const evento = new Event('submit', { bubbles: true, cancelable: true });
    await act(async () => {
      formulario.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
    expect(aoEnviar).toHaveBeenCalledTimes(1);
  });
});

describe('ResumoErros na web', () => {
  it('é role=alert com tabindex -1 e pode receber foco', async () => {
    await montar(
      <ResumoErros
        itens={[{ campo: 'cpf', mensagem: 'Informe 11 dígitos.' }]}
        aoFocarCampo={() => {}}
      />,
    );
    const resumo = achar<HTMLElement>('[role="alert"]');
    expect(resumo.getAttribute('tabindex')).toBe('-1');
    await act(async () => resumo.focus());
    expect(document.activeElement).toBe(resumo);
    expect(resumo.textContent).toContain('Corrija 1 campo para continuar.');
  });
});
