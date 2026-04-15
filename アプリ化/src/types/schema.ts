export type SlideType =
  | 'title'
  | 'section'
  | 'text'
  | 'bullets'
  | 'two_column'
  | 'comparison'
  | 'image_text'
  | 'image_full'
  | 'timeline'
  | 'process'
  | 'cards'
  | 'stats'
  | 'quote'
  | 'table'
  | 'checklist'
  | 'closing';

export interface SlideTheme {
  primary: string;
  secondary: string;
  accent: string;
  highlight: string;
  text: string;
  textDark: string;
  background: string;
  lightBg: string;
}

export interface SlideLogo {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface SlideConfig {
  type: SlideType;
  [key: string]: unknown;
}

export interface PresentationJson {
  title: string;
  theme?: Partial<SlideTheme>;
  logo?: SlideLogo;
  slides: SlideConfig[];
}
