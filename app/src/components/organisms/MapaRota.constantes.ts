// Constante que o painel (JS inicial da tela) e o mapa (chunk sob demanda) compartilham. Fica em
// arquivo próprio para o painel não puxar `MapaRota.logica` (projeção, ladrilhos) para o bundle comum.
/** Altura do mapa, em px: o painel a reserva enquanto o código do mapa chega. */
export const ALTURA_MAPA = 240;
