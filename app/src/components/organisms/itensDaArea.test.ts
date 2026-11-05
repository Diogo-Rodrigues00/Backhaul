import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  it('administrador tem só "Resumo" (/admin); 041 e 032 acrescentam os seus', () => {
    expect(itensDaArea('admin')).toEqual([{ href: '/admin', rotulo: 'Resumo', icone: 'inbox' }]);
  });

  it('empresa tem 3 destinos; motorista tem 4, com "Certificações" (card 031)', () => {
    expect(itensDaArea('empresa')).toHaveLength(3);
    expect(itensDaArea('motorista')).toHaveLength(4);
    expect(itensDaArea('motorista').map((item) => item.rotulo)).toContain('Certificações');
  });
});
