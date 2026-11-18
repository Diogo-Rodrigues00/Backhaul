import { descreverMensagensNovas } from './descreverMensagensNovas';

const EU = 'usuario-empresa';
const ELE = 'usuario-motorista';
const m = (id: string, remetente_id: string) => ({ id, remetente_id });

describe('descreverMensagensNovas', () => {
  const base = [m('1', EU), m('2', ELE)];

  it('uma mensagem nova da outra parte', () => {
    expect(descreverMensagensNovas(base, [...base, m('3', ELE)], EU, 'João da Silva')).toBe(
      '1 nova mensagem de João da Silva',
    );
  });

  it('várias mensagens novas: plural', () => {
    expect(
      descreverMensagensNovas(base, [...base, m('3', ELE), m('4', ELE)], EU, 'João da Silva'),
    ).toBe('2 novas mensagens de João da Silva');
  });

  it('mensagens minhas não são anunciadas', () => {
    expect(descreverMensagensNovas(base, [...base, m('3', EU)], EU, 'João da Silva')).toBeNull();
  });

  it('conta só as da outra parte quando chegam as duas', () => {
    expect(
      descreverMensagensNovas(base, [...base, m('3', EU), m('4', ELE)], EU, 'João da Silva'),
    ).toBe('1 nova mensagem de João da Silva');
  });

  it('nada novo: null', () => {
    expect(descreverMensagensNovas(base, [...base], EU, 'João da Silva')).toBeNull();
  });

  it('falta um dos retratos (primeira carga): null', () => {
    expect(descreverMensagensNovas(undefined, base, EU, 'João da Silva')).toBeNull();
    expect(descreverMensagensNovas(base, undefined, EU, 'João da Silva')).toBeNull();
  });
});
