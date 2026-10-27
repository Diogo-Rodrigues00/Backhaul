// tokens.ts: gerado a partir de docs/front/design-system.md (fonte da verdade)
// Não use valores soltos nos componentes: sempre leia daqui.

export const colors = {
  light: {
    bg: {
      page: '#EDEFF2',
      surface: '#FFFFFF',
      sunken: '#E1E5EA',
      inverse: '#14181D',
      highlight: '#FFF0C2',
    },
    text: {
      primary: '#14181D',
      secondary: '#3D4651',
      muted: '#566070',
      onInverse: '#F4F6F8',
      onInverseMuted: '#B9C1CB',
      accent: '#9A3A00',
      link: '#0F4C9A',
    },
    border: {
      subtle: '#C5CBD3',
      control: '#66707C',
      strong: '#14181D',
    },
    action: {
      fill: '#FFB300',
      fillHover: '#FFC233',
      fillPressed: '#E69F00',
      onFill: '#14181D',
      border: '#14181D',
    },
    focus: {
      ring: '#14181D',
      ringOnInverse: '#FFD54A',
    },
    success: {
      text: '#0F6B3A',
      bg: '#DDF3E4',
      fill: '#0F6B3A',
      onFill: '#FFFFFF',
    },
    error: {
      text: '#B3261E',
      bg: '#FCE4E1',
      border: '#B3261E',
    },
    info: {
      text: '#1B5BA8',
      bg: '#E1ECF9',
    },
    urgency: {
      normal: {
        bg: '#E7EAEE',
        text: '#14181D',
        border: '#566070',
      },
      urgente: {
        bg: '#FFB300',
        text: '#14181D',
        border: '#14181D',
      },
      critico: {
        bg: '#C42B1C',
        text: '#FFFFFF',
        border: '#14181D',
      },
    },
    disabled: {
      bg: '#DADFE5',
      text: '#5E6773',
    },
  },
  dark: {
    bg: {
      page: '#0E1216',
      surface: '#171C22',
      sunken: '#0A0D10',
      inverse: '#0A0D10',
      highlight: '#3A2C06',
    },
    text: {
      primary: '#F1F3F5',
      secondary: '#C3CAD2',
      muted: '#9CA6B2',
      onInverse: '#F4F6F8',
      onInverseMuted: '#B9C1CB',
      accent: '#FFC247',
      link: '#8FBFFF',
    },
    border: {
      subtle: '#2F3842',
      control: '#7C8794',
      strong: '#F1F3F5',
    },
    action: {
      fill: '#FFB300',
      fillHover: '#FFC233',
      fillPressed: '#E69F00',
      onFill: '#14181D',
      border: '#FFB300',
    },
    focus: {
      ring: '#FFD54A',
      ringOnInverse: '#FFD54A',
    },
    success: {
      text: '#5FD08A',
      bg: '#12301F',
      fill: '#5FD08A',
      onFill: '#06210F',
    },
    error: {
      text: '#FF8E85',
      bg: '#3A1512',
      border: '#FF8E85',
    },
    info: {
      text: '#8FBFFF',
      bg: '#10233B',
    },
    urgency: {
      normal: {
        bg: '#252C35',
        text: '#F1F3F5',
        border: '#9CA6B2',
      },
      urgente: {
        bg: '#FFB300',
        text: '#14181D',
        border: '#FFB300',
      },
      critico: {
        bg: '#F0584A',
        text: '#14181D',
        border: '#F0584A',
      },
    },
    disabled: {
      bg: '#232A32',
      text: '#8E98A4',
    },
  },
} as const;

/** Cores que não mudam de tema (marca e faixas decorativas). */
export const brand = {
  amber: '#FFB300',
  asphalt: '#14181D',
  hazardStripe: 'repeating-linear-gradient(135deg, #14181D 0 12px, #FFB300 12px 24px)', // só web; no iPhone use imagem/SVG repetido
} as const;

export const fonts = {
  // pacote: @expo-google-fonts/barlow (Barlow_500Medium, Barlow_700Bold)
  regular: 'Barlow_500Medium',
  bold: 'Barlow_700Bold',
  fallbackWeb:
    '"Barlow", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
} as const;

/** Tamanhos em px. No iPhone, respeitar Dynamic Type (allowFontScaling padrão) e maxFontSizeMultiplier 2. */
export const type = {
  caption: { size: 13, line: 18, weight: 'regular' },
  sm: { size: 15, line: 22, weight: 'regular' },
  base: { size: 17, line: 26, weight: 'regular' },
  lg: { size: 19, line: 24, weight: 'bold' },
  xl: { size: 24, line: 30, weight: 'bold' },
  '2xl': { size: 30, line: 36, weight: 'bold' },
  '3xl': { size: 38, line: 44, weight: 'bold' },
  display: { size: 52, line: 56, weight: 'bold' },
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
export const border = { width: 2, widthStrong: 3, widthInvalid: 3 } as const;
export const touch = { min: 44, control: 48, primary: 56, absoluteMin: 24 } as const;
export const breakpoints = { compact: 420, phone: 720, tabbar: 960, wide: 1240 } as const; // largura máxima do contêiner da app para cada regra

export const shadow = {
  light: {
    card: {
      shadowColor: '#14181D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    dialog: {
      shadowColor: '#14181D',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.3,
      shadowRadius: 36,
      elevation: 12,
    },
  },
  // no escuro a hierarquia vem da borda e do tom da superfície
  dark: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    dialog: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.65,
      shadowRadius: 40,
      elevation: 12,
    },
  },
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 360 },
  easing: [0.2, 0.8, 0.2, 1] as const, // cubic-bezier de desaceleração
  pollingMs: 10000,
  /** Com prefers-reduced-motion (web) ou isReduceMotionEnabled (iOS): duração 0 e sem loops. */
} as const;

export const urgencyLabel = { normal: 'Normal', urgente: 'Urgente', critico: 'Crítico' } as const;
export const urgencyIcon = {
  normal: 'circle',
  urgente: 'triangle-alert',
  critico: 'octagon-alert',
} as const;
export type ThemeName = keyof typeof colors;
export type Urgency = keyof typeof urgencyLabel;
