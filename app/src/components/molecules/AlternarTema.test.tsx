import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { AlternarTema, type PreferenciaTema } from './AlternarTema';

afterEach(() => jest.restoreAllMocks());

describe('AlternarTema', () => {
  it.each<[PreferenciaTema, string]>([
    ['sistema', 'Alternar tema. Atual: auto (segue o sistema)'],
    ['claro', 'Alternar tema. Atual: claro'],
    ['escuro', 'Alternar tema. Atual: escuro'],
  ])('com %s o nome acessível diz o tema atual', async (preferencia, nome) => {
    await renderizar(<AlternarTema preferencia={preferencia} aoAlternar={() => {}} />);
    expect(screen.getByRole('button', { name: nome })).toBeOnTheScreen();
  });

  it('ao tocar pede para ciclar o tema', async () => {
    const aoAlternar = jest.fn();
    await renderizar(<AlternarTema preferencia="sistema" aoAlternar={aoAlternar} />);
    await fireEvent.press(screen.getByRole('button', { name: /Alternar tema/ }));
    expect(aoAlternar).toHaveBeenCalledTimes(1);
  });

  it('o alvo tem 44 px ou mais', async () => {
    await renderizar(<AlternarTema preferencia="claro" aoAlternar={() => {}} />);
    const estilo = screen.getByRole('button').props.style;
    const plano = typeof estilo === 'function' ? estilo({ pressed: false }) : estilo;
    expect(JSON.stringify(plano)).toContain('"minHeight":44');
  });

  it('na web mostra o texto do tema (escondido no celular só por CSS)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    // O Icone do Jest é o do iPhone, que não entende `var(--…)`; só o aviso do SVG, não o teste.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizar(<AlternarTema preferencia="escuro" aoAlternar={() => {}} />);
    expect(screen.getByText('Escuro')).toBeOnTheScreen();
  });

  it.each<[PreferenciaTema, string]>([
    ['sistema', 'Auto'],
    ['claro', 'Claro'],
    ['escuro', 'Escuro'],
  ])('o texto visível de %s está dentro do nome acessível (WCAG 2.5.3)', async (pref, visivel) => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizar(<AlternarTema preferencia={pref} aoAlternar={() => {}} />);
    const nome = String(screen.getByRole('button').props.accessibilityLabel);
    expect(nome.toLowerCase()).toContain(visivel.toLowerCase());
    expect(screen.getByText(visivel)).toBeOnTheScreen();
  });

  it('no iPhone estreito sobra só o ícone', async () => {
    await renderizar(<AlternarTema preferencia="escuro" aoAlternar={() => {}} />);
    expect(screen.queryByText('Escuro')).toBeNull();
  });
});
