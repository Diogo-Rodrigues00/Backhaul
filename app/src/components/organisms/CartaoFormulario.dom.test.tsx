/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// Enter no <form> da web (jsdom + react-native-web): o Botao é um Pressable, então o navegador só
// enviaria sozinho com um campo; o cartão captura o Enter de qualquer campo de texto.
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Controller, useForm } from 'react-hook-form';

import { CampoTexto } from '@/components/molecules/CampoTexto';
import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { CartaoFormulario, CelulaFormulario } from './CartaoFormulario';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: () => false }));
jest.mock('@/components/atoms/Icone', () => jest.requireActual('@/components/atoms/Icone.web'));
jest.mock('@/lib/a11y', () => jest.requireActual('@/lib/a11y.web'));
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReturnType<typeof createRoot>;
let contêiner: HTMLDivElement;

async function montar(ui: ReactElement) {
  await act(async () =>
    raiz.render(
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
      </TemaContext.Provider>,
    ),
  );
}

function campos() {
  return Array.from(contêiner.querySelectorAll<HTMLInputElement>('input'));
}

async function enter(alvo: Element, key = 'Enter') {
  const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => {
    alvo.dispatchEvent(evento);
  });
  return evento;
}

function Dois({ aoEnviar }: { aoEnviar: () => void | Promise<unknown> }) {
  return (
    <CartaoFormulario
      nome="Dois campos"
      aoEnviar={aoEnviar}
      acoes={<button type="button">ok</button>}
    >
      <CelulaFormulario>
        <CampoTexto rotulo="E-mail" />
      </CelulaFormulario>
      <CelulaFormulario>
        <CampoTexto rotulo="Nome" />
      </CelulaFormulario>
    </CartaoFormulario>
  );
}

// Formulário real: campo obrigatório vazio => o envio não chega ao `enviar`.
function ComValidacao({ enviar }: { enviar: () => void }) {
  const { control, handleSubmit } = useForm<{ email: string; nome: string }>({
    defaultValues: { email: '', nome: '' },
  });
  return (
    <CartaoFormulario
      nome="Validado"
      aoEnviar={handleSubmit(() => enviar())}
      acoes={<button type="button">ok</button>}
    >
      {(['email', 'nome'] as const).map((nome) => (
        <CelulaFormulario key={nome}>
          <Controller
            control={control}
            name={nome}
            rules={{ required: 'Preencha este campo.' }}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo={nome}
                value={field.value}
                onChangeText={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
      ))}
    </CartaoFormulario>
  );
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

describe('CartaoFormulario: Enter na web', () => {
  it('com 2 campos de texto, Enter em qualquer um envia 1 vez e cancela o padrão', async () => {
    const aoEnviar = jest.fn();
    await montar(<Dois aoEnviar={aoEnviar} />);

    const evento = await enter(campos()[0]!);
    expect(evento.defaultPrevented).toBe(true);
    expect(aoEnviar).toHaveBeenCalledTimes(1);

    await enter(campos()[1]!);
    expect(aoEnviar).toHaveBeenCalledTimes(2);
  });

  it('Enter repetido enquanto o envio não terminou não duplica', async () => {
    let concluir: () => void = () => {};
    const aoEnviar = jest.fn(
      () =>
        new Promise<void>((resolver) => {
          concluir = resolver;
        }),
    );
    await montar(<Dois aoEnviar={aoEnviar} />);

    await enter(campos()[0]!);
    await enter(campos()[0]!);
    await enter(campos()[1]!);
    expect(aoEnviar).toHaveBeenCalledTimes(1);

    await act(async () => concluir());
    await enter(campos()[0]!);
    expect(aoEnviar).toHaveBeenCalledTimes(2);
  });

  it('só Enter em campo de texto envia: outras teclas e botões não', async () => {
    const aoEnviar = jest.fn();
    await montar(<Dois aoEnviar={aoEnviar} />);

    await enter(campos()[0]!, 'a');
    await enter(contêiner.querySelector('button')!);
    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it('Enter com erro local não envia (o handleSubmit recusa) e mostra os erros', async () => {
    const enviar = jest.fn();
    await montar(<ComValidacao enviar={enviar} />);

    await enter(campos()[0]!);
    await act(async () => {});
    expect(enviar).not.toHaveBeenCalled();
    expect(contêiner.textContent).toContain('Preencha este campo.');
  });
});
