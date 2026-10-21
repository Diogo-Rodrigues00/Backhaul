import { rotaDeEntrada, rotaInicial, rotuloDoPerfil } from './areas';

describe('rotaInicial', () => {
  it('leva cada perfil à sua área', () => {
    expect(rotaInicial('empresa')).toBe('/empresa/cargas');
    expect(rotaInicial('motorista')).toBe('/motorista/cargas');
    expect(rotaInicial('admin')).toBe('/admin');
  });
});

describe('rotaDeEntrada', () => {
  it('sem aviso é só /entrar', () => {
    expect(rotaDeEntrada()).toBe('/entrar');
    expect(rotaDeEntrada(null)).toBe('/entrar');
  });

  it('com aviso leva o motivo na query', () => {
    expect(rotaDeEntrada('sessao-expirada')).toBe('/entrar?aviso=sessao-expirada');
    expect(rotaDeEntrada('conta-nao-encontrada')).toBe('/entrar?aviso=conta-nao-encontrada');
  });
});

describe('rotuloDoPerfil', () => {
  it('devolve o perfil em texto de tela', () => {
    expect(rotuloDoPerfil('empresa')).toBe('Empresa');
    expect(rotuloDoPerfil('motorista')).toBe('Motorista');
    expect(rotuloDoPerfil('admin')).toBe('Administrador');
  });
});
