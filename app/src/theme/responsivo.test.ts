import { correspondeBp, dataBp, pontosDeQuebra } from './responsivo';

describe('responsivo', () => {
  it('dataBp devolve o dataSet do react-native-web', () => {
    expect(dataBp('so-celular')).toEqual({ bp: 'so-celular' });
  });

  it('pontos de quebra vêm dos tokens', () => {
    expect(pontosDeQuebra).toEqual({ compacto: 420, celular: 720, barra: 960, largo: 1240 });
  });

  it('so-X aparece até a largura de X; sem-X aparece acima dela', () => {
    expect(correspondeBp('so-celular', 720)).toBe(true);
    expect(correspondeBp('so-celular', 721)).toBe(false);
    expect(correspondeBp('sem-celular', 720)).toBe(false);
    expect(correspondeBp('sem-celular', 721)).toBe(true);
    expect(correspondeBp('so-barra', 390)).toBe(true);
    expect(correspondeBp('sem-largo', 1280)).toBe(true);
  });
});
