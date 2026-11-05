import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  it('administrador tem só "Resumo" (/admin); 041 e 032 acrescentam os seus', () => {
    expect(itensDaArea('admin')).toEqual([{ href: '/admin', rotulo: 'Resumo', icone: 'inbox' }]);
  });

  it('empresa continua com 3 destinos', () => {
    expect(itensDaArea('empresa')).toHaveLength(3);
  });

  // Card 026: o motorista tem 4 destinos; "Disponibilidade" vai para o "Mais" da barra inferior.
  it('motorista tem 4 destinos, com Minhas propostas e Disponibilidade marcada para o "Mais"', () => {
    const motorista = itensDaArea('motorista');
    expect(motorista).toHaveLength(4);
    expect(motorista.find((item) => item.rotulo === 'Minhas propostas')?.noMais).toBeUndefined();
    expect(motorista.find((item) => item.rotulo === 'Disponibilidade')?.noMais).toBe(true);
  });
});
