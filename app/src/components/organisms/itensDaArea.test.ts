import { itensDaArea } from './itensDaArea';

describe('itensDaArea', () => {
  it('administrador tem só "Resumo" (/admin); 041 e 032 acrescentam os seus', () => {
    expect(itensDaArea('admin')).toEqual([{ href: '/admin', rotulo: 'Resumo', icone: 'inbox' }]);
  });

  it('empresa e motorista continuam com 3 destinos', () => {
    expect(itensDaArea('empresa')).toHaveLength(3);
    expect(itensDaArea('motorista')).toHaveLength(3);
  });
});
