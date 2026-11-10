import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CartaoUsuarioAdmin } from './CartaoUsuarioAdmin';

const CRIADO = '2026-11-01T15:00:00.000Z';

describe('CartaoUsuarioAdmin', () => {
  it('nome em h3, e-mail, perfil e situação em texto', async () => {
    await renderizar(
      <CartaoUsuarioAdmin
        nome="Maria Souza"
        email="maria@mock.test"
        tipo="motorista"
        ativo={false}
        criadoEm={CRIADO}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Maria Souza' }).props['aria-level']).toBe(3);
    expect(screen.getByLabelText('E-mail: maria@mock.test')).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil: Motorista')).toBeOnTheScreen();
    expect(screen.getByLabelText('Situação: Inativo')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Cadastrado em: 01\/11\/2026/)).toBeOnTheScreen();
  });

  it('sem nome (admin), o título é o e-mail', async () => {
    await renderizar(
      <CartaoUsuarioAdmin
        nome={null}
        email="admin@mock.test"
        tipo="admin"
        ativo
        criadoEm={CRIADO}
      />,
    );

    expect(screen.getByRole('heading', { name: 'admin@mock.test' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil: Administrador')).toBeOnTheScreen();
    expect(screen.getByLabelText('Situação: Ativo')).toBeOnTheScreen();
  });
});
