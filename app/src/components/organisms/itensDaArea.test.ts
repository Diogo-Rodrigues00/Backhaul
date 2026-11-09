import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  // Card 041: Fretes e Usuários vêm depois de "Resumo" (o 032 acrescenta o dele).
  it('administrador tem Resumo, Fretes e Usuários, nessa ordem', () => {
    expect(itensDaArea('admin')).toEqual(
      expect.arrayContaining([
        { href: '/admin', rotulo: 'Resumo', icone: 'inbox' },
        { href: '/admin/fretes', rotulo: 'Fretes', icone: 'truck' },
        { href: '/admin/usuarios', rotulo: 'Usuários', icone: 'user' },
      ]),
    );
    expect(
      itensDaArea('admin')
        .map((item) => item.rotulo)
        .slice(0, 3),
    ).toEqual(['Resumo', 'Fretes', 'Usuários']);
  });

  it('empresa continua com 3 destinos', () => {
    expect(itensDaArea('empresa')).toHaveLength(3);
  });

  // Cards 026 e 031: o motorista tem 5 destinos; "Disponibilidade" e "Certificações" vão para o "Mais".
  it('motorista tem 5 destinos, com Disponibilidade e Certificações marcadas para o "Mais"', () => {
    const motorista = itensDaArea('motorista');
    expect(motorista).toHaveLength(5);
    expect(motorista.find((item) => item.rotulo === 'Minhas propostas')?.noMais).toBeUndefined();
    expect(motorista.find((item) => item.rotulo === 'Disponibilidade')?.noMais).toBe(true);
    expect(motorista.find((item) => item.rotulo === 'Certificações')).toMatchObject({
      href: '/motorista/certificacoes',
      icone: 'award',
      noMais: true,
    });
  });
});
