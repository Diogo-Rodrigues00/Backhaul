import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

import { apagar, CHAVE_TEMA, gravar, ler } from './armazenamentoTema';
import { montarTema, type Esquema, type TemaVisual } from './montarTema';

export type Preferencia = 'sistema' | 'claro' | 'escuro';

export interface ValorTema extends TemaVisual {
  preferencia: Preferencia;
  /** Esquema efetivo agora: o escolhido ou, em "sistema", o do aparelho. */
  esquema: Esquema;
  /** Cicla Sistema, Claro, Escuro e salva a escolha. */
  alternar: () => void;
}

export const TemaContext = createContext<ValorTema | null>(null);

const ORDEM: readonly Preferencia[] = ['sistema', 'claro', 'escuro'];

// Valores gravados (e lidos pelo script inline do +html.tsx): ausente = sistema.
const paraGravado = { claro: 'light', escuro: 'dark' } as const;

function deGravado(valor: string | null): Preferencia {
  if (valor === 'light') return 'claro';
  if (valor === 'dark') return 'escuro';
  return 'sistema';
}

/** Na web o tema vive em `<html data-theme>`; sem atributo o CSS segue o sistema. */
function aplicarNaWeb(preferencia: Preferencia): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (preferencia === 'sistema') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = paraGravado[preferencia];
  }
}

export function TemaProvider({ children }: PropsWithChildren) {
  const [preferencia, setPreferencia] = useState<Preferencia>('sistema');
  // Na web o HTML estático não sabe o tema do aparelho: até montar, o esquema é 'light' em
  // servidor e cliente (mesma saída, sem aviso de hidratação). As cores nem dependem disso.
  const [montado, setMontado] = useState(Platform.OS !== 'web');
  const sistema = useColorScheme();

  useEffect(() => {
    let ativo = true;
    ler(CHAVE_TEMA).then((valor) => {
      if (!ativo) return;
      const lida = deGravado(valor);
      setPreferencia((atual) => (atual === 'sistema' ? lida : atual));
      aplicarNaWeb(lida);
      setMontado(true);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const alternar = useCallback(() => {
    const proxima = ORDEM[(ORDEM.indexOf(preferencia) + 1) % ORDEM.length] ?? 'sistema';
    setPreferencia(proxima);
    aplicarNaWeb(proxima);
    if (proxima === 'sistema') {
      void apagar(CHAVE_TEMA);
    } else {
      void gravar(CHAVE_TEMA, paraGravado[proxima]);
    }
  }, [preferencia]);

  const esquema: Esquema =
    preferencia === 'claro'
      ? 'light'
      : preferencia === 'escuro'
        ? 'dark'
        : montado && sistema === 'dark'
          ? 'dark'
          : 'light';

  const valor = useMemo<ValorTema>(
    () => ({ ...montarTema(esquema), preferencia, esquema, alternar }),
    [esquema, preferencia, alternar],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
