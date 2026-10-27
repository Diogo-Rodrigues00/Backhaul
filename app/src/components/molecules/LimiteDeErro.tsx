import { Component, type ReactNode } from 'react';

export interface PropsLimiteDeErro {
  /** O que aparece no lugar dos filhos depois que um deles falha ao renderizar ou ao carregar. */
  fallback: ReactNode;
  /** Chamado uma vez por falha (para quem precisa reagir, além de mostrar o `fallback`). */
  aoFalhar?: (erro: unknown) => void;
  children?: ReactNode;
}

/**
 * Limite de erro: segura a falha de um filho (inclusive um `React.lazy` cujo chunk não baixou) e
 * mostra o `fallback`. Para tentar de novo, quem usa troca a `key` e o limite nasce limpo.
 */
export class LimiteDeErro extends Component<PropsLimiteDeErro, { falhou: boolean }> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro: unknown) {
    this.props.aoFalhar?.(erro);
  }

  render() {
    return this.state.falhou ? this.props.fallback : this.props.children;
  }
}
