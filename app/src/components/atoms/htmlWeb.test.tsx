// Confere o HTML que o react-native-web gera para os atoms (é o que vai para o site exportado):
// Titulo nivel 1 vira <h1>, Botao vira <button>, links viram <a href>. O Jest roda como iPhone;
// aqui o módulo `react-native` é trocado pelo react-native-web só neste arquivo.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { Botao } from './Botao';
import { Texto } from './Texto';
import { TextoOculto } from './TextoOculto';
import { Titulo } from './Titulo';

// O babel-jest leva os jest.mock para antes dos imports.
jest.mock('react-native', () => jest.requireActual('react-native-web'));
// Na web o Metro escolhe Icone.web (<svg>); o Jest escolheria o do iPhone.
jest.mock('./Icone', () => jest.requireActual('./Icone.web'));
// O TemaProvider não é usado aqui (só o contexto), mas importa o armazenamento do iPhone.
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));

function html(ui: ReactElement) {
  return renderToStaticMarkup(
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
  );
}

describe('HTML gerado na web', () => {
  it('Titulo nivel={1} gera <h1>; 2 e 3 geram <h2> e <h3>', () => {
    expect(html(<Titulo nivel={1}>Entrar</Titulo>)).toMatch(/^<h1[^>]*>Entrar<\/h1>$/);
    expect(html(<Titulo nivel={2}>Dados</Titulo>)).toMatch(/^<h2[^>]*>Dados<\/h2>$/);
    expect(html(<Titulo nivel={3}>Rota</Titulo>)).toMatch(/^<h3[^>]*>Rota<\/h3>$/);
  });

  it('Titulo com tabIndex={-1} pode receber foco por código', () => {
    expect(
      html(
        <Titulo nivel={1} tabIndex={-1}>
          Tela
        </Titulo>,
      ),
    ).toContain('tabindex="-1"');
  });

  it('Texto numerico liga data-num (algarismos tabulares)', () => {
    expect(html(<Texto numerico>3.500,00</Texto>)).toContain('data-num=""');
    expect(html(<Texto>texto</Texto>)).not.toContain('data-num');
  });

  it('Texto sai com a fonte do DS em rem e sem cor literal no HTML', () => {
    const saida = html(<Texto cor="destaque">R$ 10</Texto>);
    expect(saida).toContain('font-size:1.0625rem');
    expect(saida).toContain('"Barlow"'.replace(/"/g, '&quot;'));
    expect(saida).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it('Botao gera <button type="button"> com o rótulo', () => {
    const saida = html(<Botao>Publicar carga</Botao>);
    expect(saida).toMatch(/^<button[^>]*type="button"/);
    expect(saida).toContain('Publicar carga');
    expect(saida).not.toContain('disabled');
  });

  it('Botao desabilitado é <button disabled> de verdade', () => {
    const saida = html(<Botao desabilitado>Salvar</Botao>);
    expect(saida).toMatch(/<button[^>]*disabled/);
    expect(saida).toContain('aria-disabled="true"');
  });

  it('Botao carregando: aria-busy e o rótulo de progresso', () => {
    const saida = html(
      <Botao carregando rotuloCarregando="Publicando…">
        Publicar
      </Botao>,
    );
    expect(saida).toContain('aria-busy="true"');
    expect(saida).toContain('Publicando…');
    expect(saida).not.toContain('>Publicar<');
  });

  it('TextoOculto fica na árvore (sem aria-hidden nem display:none)', () => {
    const saida = html(<TextoOculto>(etapa atual)</TextoOculto>);
    expect(saida).toContain('(etapa atual)');
    expect(saida).not.toContain('aria-hidden');
    expect(saida).not.toContain('display:none');
  });
});
