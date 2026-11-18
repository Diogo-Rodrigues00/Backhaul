import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  it('administrador tem Resumo, Aprovações, Fretes e Usuários, nessa ordem', () => {
    expect(itensDaArea('admin')).toEqual(
      expect.arrayContaining([
        { href: '/admin', rotulo: 'Resumo', icone: 'inbox' },
        { href: '/admin/certificacoes', rotulo: 'Aprovações', icone: 'hourglass' },
        { href: '/admin/fretes', rotulo: 'Fretes', icone: 'truck' },
        { href: '/admin/usuarios', rotulo: 'Usuários', icone: 'user' },
      ]),
    );
    expect(itensDaArea('admin').map((item) => item.rotulo)).toEqual([
      'Resumo',
      'Aprovações',
      'Fretes',
      'Usuários',
    ]);
  });

  it('empresa continua com 3 destinos', () => {
    expect(itensDaArea('empresa')).toHaveLength(3);
  });

  // Cards 026, 031 e 047: o motorista tem 6 destinos; "Disponibilidade", "Certificações" e "Chave Pix" vão para o "Mais".
  it('motorista tem 6 destinos, com Disponibilidade, Certificações e Chave Pix marcadas para o "Mais"', () => {
    const motorista = itensDaArea('motorista');
    expect(motorista).toHaveLength(6);
    expect(motorista.find((item) => item.rotulo === 'Minhas propostas')?.noMais).toBeUndefined();
    expect(motorista.find((item) => item.rotulo === 'Disponibilidade')?.noMais).toBe(true);
    expect(motorista.find((item) => item.rotulo === 'Certificações')).toMatchObject({
      href: '/motorista/certificacoes',
      icone: 'award',
      noMais: true,
    });
    expect(motorista.find((item) => item.rotulo === 'Chave Pix')).toMatchObject({
      href: '/motorista/chave-pix',
      icone: 'banknote',
      noMais: true,
    });
  });
});
