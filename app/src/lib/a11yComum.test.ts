import { emitirAnuncio, ouvirAnuncios } from './a11yComum';

describe('emitirAnuncio e ouvirAnuncios', () => {
  it('entrega o texto aparado aos ouvintes', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    emitirAnuncio('  1 nova proposta  ');

    expect(ouvinte).toHaveBeenCalledWith('1 nova proposta');
    parar();
  });

  it('ignora mensagem vazia ou só com espaços', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    emitirAnuncio('');
    emitirAnuncio('   ');

    expect(ouvinte).not.toHaveBeenCalled();
    parar();
  });

  it('para de entregar depois de cancelar a assinatura', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    parar();
    emitirAnuncio('Proposta aceita');

    expect(ouvinte).not.toHaveBeenCalled();
  });

  it('entrega a todos os ouvintes ativos', () => {
    const primeiro = jest.fn();
    const segundo = jest.fn();
    const pararPrimeiro = ouvirAnuncios(primeiro);
    const pararSegundo = ouvirAnuncios(segundo);

    emitirAnuncio('Pagamento liberado');

    expect(primeiro).toHaveBeenCalledWith('Pagamento liberado');
    expect(segundo).toHaveBeenCalledWith('Pagamento liberado');
    pararPrimeiro();
    pararSegundo();
  });
});
