import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';

import { montarTema, type Esquema, type TemaVisual } from './montarTema';

export type Preferencia = 'sistema' | 'claro' | 'escuro';

export interface ValorTema extends TemaVisual {
  preferencia: Preferencia;
  /** Esquema efetivo agora: o escolhido ou, em "sistema", o do aparelho. */
  esquema: Esquema;
  /** Cicla Sistema, Claro, Escuro e salva a escolha. */
  alternar: () => void;
  /**
   * `true` quando a preferência salva já foi lida. No iPhone o layout segura o conteúdo até lá,
   * para não piscar o tema errado. Na web é sempre `true` (o script do +html.tsx já aplicou o tema).
   */
  pronto: boolean;
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
  const [montado, setMontado] = useState(false);
  const sistema = useColorScheme();
  // Se o usuário alternar antes de a leitura terminar, a escolha dele vale e a leitura é descartada.
  const alternouRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    ler(CHAVES.tema).then((valor) => {
      if (!ativo) return;
      if (!alternouRef.current) {
        const lida = deGravado(valor);
        setPreferencia(lida);
        aplicarNaWeb(lida);
      }
      setMontado(true);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const alternar = useCallback(() => {
    alternouRef.current = true;
    const proxima = ORDEM[(ORDEM.indexOf(preferencia) + 1) % ORDEM.length] ?? 'sistema';
    setPreferencia(proxima);
    aplicarNaWeb(proxima);
    if (proxima === 'sistema') {
      void apagar(CHAVES.tema);
    } else {
      void gravar(CHAVES.tema, paraGravado[proxima]);
    }
  }, [preferencia]);

  const esquema: Esquema =
    preferencia === 'claro'
      ? 'light'
      : preferencia === 'escuro'
        ? 'dark'
        : (Platform.OS !== 'web' || montado) && sistema === 'dark'
          ? 'dark'
          : 'light';

  const pronto = Platform.OS === 'web' || montado;

  const valor = useMemo<ValorTema>(
    () => ({ ...montarTema(esquema), preferencia, esquema, alternar, pronto }),
    [esquema, preferencia, alternar, pronto],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
