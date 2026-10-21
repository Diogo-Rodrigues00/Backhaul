import { Texto, type PropsTexto } from './Texto';
import { estiloOculto } from './oculto';

/**
 * Texto só para leitor de tela (ex.: "(etapa atual)", prefixo "Urgência: "). Fica fora da vista,
 * mas continua na árvore de acessibilidade.
 */
export function TextoOculto({ style, ...resto }: PropsTexto) {
  return <Texto nivel="sm" {...resto} style={[estiloOculto, style]} />;
}
