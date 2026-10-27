// Ponto único de carregamento dos formulários que as rotas trazem por React.lazy (ADR 0011).
// Os formulários de Publicar carga (019) e Publicar disponibilidade (023) usam os mesmos blocos
// (SeletorLocal, GrupoOpcoes, CartaoFormulario). Se cada um fosse um chunk assíncrono separado, o
// Metro moveria o que eles dividem para o chunk comum, que entra no JS inicial de toda rota. Com os
// dois neste módulo há um chunk só, baixado quando a pessoa abre qualquer uma das duas telas.
export { default as FormularioPublicarCarga } from './FormularioPublicarCarga';
export { default as FormularioPublicarDisponibilidade } from './FormularioPublicarDisponibilidade';
