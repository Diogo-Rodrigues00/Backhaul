import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  it('administrador começa por "Resumo" (/admin); 041 acrescenta os seus', () => {
    expect(itensDaArea('admin')[0]).toEqual({ href: '/admin', rotulo: 'Resumo', icone: 'inbox' });
  });

  // Card 032: o item da fila de certificações chama "Aprovações" (decisão de 04/11).
  it('administrador tem "Aprovações" (/admin/certificacoes) com o ícone hourglass', () => {
    expect(itensDaArea('admin')).toContainEqual({
      href: '/admin/certificacoes',
      rotulo: 'Aprovações',
      icone: 'hourglass',
    });
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
