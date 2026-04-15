export interface ClientProfile {
  id: string;
  name: string;
  nameReading: string;
  title: string;
  company?: string;
  tone: {
    style: string;
    firstPerson: string;
    readerAddress: string;
    characteristics: string;
  };
  prohibitedWords: string[];
  requiredTerms: string[];
  commonPhrases: string[];
  achievements: string[];
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
}
