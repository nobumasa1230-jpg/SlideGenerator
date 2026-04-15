interface ClientProfile {
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

const clients: ClientProfile[] = [
  {
    id: 'goto',
    name: '後藤 伸正',
    nameReading: 'Goto Nobumasa',
    title: 'プロモーション型コピーライター',
    company: '2社経営（日本・ドバイ）',
    tone: { style: '親しみやすく率直。体験談ベースで語る。', firstPerson: '僕', readerAddress: 'あなた', characteristics: '数字を使って具体的に伝える。共感→構造→行動提案のセット' },
    prohibitedWords: ['誰でもできます', '簡単に', '楽して', 'すぐに', '不労所得', '皆さん', '〜な方'],
    requiredTerms: ['仕組み', '設計図', '本質', '構造', '再現性', '凡事徹底', 'プロモーション'],
    commonPhrases: ['この手紙は読む人を選びます', '決めるのは、あなたです', '想像してみてください'],
    achievements: ['累計28.7億円の売上貢献', '18社のクライアント', 'ダイレクト出版ベスト・オブマーケッター受賞'],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
  {
    id: 'maegawa',
    name: '前川雅治',
    nameReading: 'Maegawa Masaharu',
    title: '',
    tone: { style: '熱くて厳しいけど根は優しい関西の兄貴。関西弁ベース', firstPerson: '僕', readerAddress: '先生', characteristics: '煽るが追い詰めない。自己開示で共感→解決策＋煽動' },
    prohibitedWords: ['楽して稼ぐ', '不労所得', '簡単に儲かる', 'ございます', 'お客様'],
    requiredTerms: ['先生', '患者さん', '覚悟', 'チャレンジ'],
    commonPhrases: ['覚悟を決めろ', 'じゃないですか', 'でも、、、本当にそれでいいんですか？'],
    achievements: [],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
  {
    id: 'honda',
    name: '本田洋三',
    nameReading: 'Honda Yozo',
    title: '足の専門家 鍼灸師',
    company: '鍼灸整体院リーフ',
    tone: { style: '穏やかな確信。煽りを排除し事実で語る', firstPerson: '僕', readerAddress: '先生/患者さん', characteristics: '臨床データと改善事例を淡々と積み上げる' },
    prohibitedWords: ['一発で治る', '絶対治る', '奇跡', '魔法の', '手術不要', '楽して治す'],
    requiredTerms: ['改善', '患者さん', '足指ほぐし', 'セルフケア', '根本'],
    commonPhrases: ['足指をほぐしてあげてください', 'セルフケアが大事なんですよ'],
    achievements: [],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
  {
    id: 'furuta',
    name: '古田宏幸',
    nameReading: 'Furuta Hiroyuki',
    title: '',
    tone: { style: '穏やかだが腕に自信を持つ若手職人', firstPerson: '僕', readerAddress: '先生', characteristics: '穏やかに解説。タイトルは煽りでも本文は教育的' },
    prohibitedWords: ['楽して稼ぐ', '裏技', '一発で治る', '感覚で治す', 'ゴッドハンドになれる'],
    requiredTerms: ['側弯症', '古田式', '動作分析', '評価', 'SIT療法'],
    commonPhrases: ['ここが大事なんですよ', 'やっぱ評価が一番大事ですね'],
    achievements: [],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
  {
    id: 'nakamura',
    name: '中村光太郎',
    nameReading: 'Nakamura Kotaro',
    title: '',
    tone: { style: '80店舗を率いる現場叩き上げ社長の熱量全開トーク', firstPerson: '俺', readerAddress: 'みんな', characteristics: '感情ストレート。俺もそうだった+甘えるな' },
    prohibitedWords: ['楽して稼ぐ', 'コピペで稼ぐ', '確実に稼げる', 'リスクゼロ', 'あなたは悪くない'],
    requiredTerms: ['やっぱ', 'めちゃくちゃ', 'ぶっちゃけ', 'お金'],
    commonPhrases: ['やっぱ、○○なんだよね', '結局さ、やるかやらないかだよ'],
    achievements: [],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
  {
    id: 'uchida',
    name: '内田',
    nameReading: 'Uchida',
    title: '',
    tone: { style: '', firstPerson: '', readerAddress: '', characteristics: '' },
    prohibitedWords: [],
    requiredTerms: [],
    commonPhrases: [],
    achievements: [],
    theme: { primary: '#1B365D', accent: '#F5A623', background: '#FFFFFF' },
  },
];

export function getClients() {
  return clients;
}

export function getClientById(id: string): ClientProfile | undefined {
  return clients.find((c) => c.id === id);
}

export function detectClientFromMemo(memo: string): ClientProfile | null {
  const memoLower = memo.toLowerCase();
  for (const client of clients) {
    const names = [client.name, client.nameReading, client.id];
    if (client.company) names.push(client.company);
    for (const name of names) {
      if (name && memoLower.includes(name.toLowerCase())) {
        return client;
      }
    }
  }
  for (const client of clients) {
    for (const term of client.requiredTerms.slice(0, 3)) {
      if (memo.includes(term)) {
        return client;
      }
    }
  }
  return null;
}
