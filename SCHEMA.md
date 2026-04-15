# スライドJSON仕様書

## 全体構造

```json
{
  "title": "プレゼンテーションのタイトル",
  "theme": {
    "primary": "#1a1a2e",
    "secondary": "#16213e",
    "accent": "#0f3460",
    "highlight": "#e94560",
    "text": "#ffffff",
    "textDark": "#333333",
    "background": "#ffffff",
    "lightBg": "#f5f5f5"
  },
  "logo": {
    "base64": "（Base64文字列）",
    "mimeType": "image/png",
    "width": 45,
    "height": 45,
    "top": 8,
    "left": 660
  },
  "slides": [ ... ]
}
```

- `theme` は省略可（デフォルト値あり）
- `logo` は省略可（指定時は全スライド右上に表示）

---

## スライドタイプ一覧 (16種類)

### 1. title - タイトル
```json
{
  "type": "title",
  "title": "メインタイトル",
  "subtitle": "サブタイトル",
  "presenter": "発表者名",
  "date": "2026年4月"
}
```

### 2. section - セクション区切り
```json
{
  "type": "section",
  "number": 1,
  "title": "セクションタイトル",
  "subtitle": "補足テキスト"
}
```

### 3. text - テキスト
```json
{
  "type": "text",
  "title": "見出し",
  "body": "本文テキスト。複数行も可能。"
}
```

### 4. bullets - 箇条書き
```json
{
  "type": "bullets",
  "title": "見出し",
  "items": ["項目1", "項目2", "項目3"]
}
```

### 5. two_column - 2カラム
```json
{
  "type": "two_column",
  "title": "見出し",
  "left_title": "左カラムタイトル",
  "left": ["左の項目1", "左の項目2"],
  "right_title": "右カラムタイトル",
  "right": ["右の項目1", "右の項目2"]
}
```

### 6. comparison - 比較表
```json
{
  "type": "comparison",
  "title": "A案 vs B案",
  "option_a_title": "A案",
  "option_a": ["メリット1", "メリット2"],
  "option_b_title": "B案",
  "option_b": ["メリット1", "メリット2"]
}
```

### 7. image_text - 画像+テキスト
```json
{
  "type": "image_text",
  "title": "見出し",
  "image_url": "https://example.com/image.png",
  "image_caption": "画像の説明",
  "body": "右側に表示するテキスト"
}
```

### 8. image_full - 画像全面表示
```json
{
  "type": "image_full",
  "title": "タイトル（下部バーに表示）",
  "image_url": "https://drive.google.com/uc?id=xxxxx",
  "caption": "キャプション（画像下部に小さく表示）"
}
```
- 画像をスライド全面に表示（720x405pt / 16:9ワイドスクリーン）
- 暗色背景で画像が映えるデザイン
- Gemini 3 Pro Imageで生成した16:9インフォグラフィック向け
- 画像はBase64埋め込み、またはGoogle Drive共有URLで指定

#### 画像の生成・アップロード手順

1. `generate_image.py` でインフォグラフィックを生成:
```bash
python3 generate_image.py "プロンプト（日本語）" images/output.png
```

2. `upload_image.sh` でGoogle Driveにアップロード:
```bash
./upload_image.sh images/output.png
# → https://drive.google.com/uc?id=xxxxx が出力される
```

3. 出力されたURLを `image_url` に設定

### 9. timeline - タイムライン
```json
{
  "type": "timeline",
  "title": "スケジュール",
  "items": [
    { "label": "4月", "description": "準備フェーズ" },
    { "label": "5月", "description": "実装フェーズ" },
    { "label": "6月", "description": "テスト" },
    { "label": "7月", "description": "リリース" }
  ]
}
```

### 10. process - プロセス図
```json
{
  "type": "process",
  "title": "ワークフロー",
  "steps": [
    { "title": "企画", "description": "要件定義と計画策定" },
    { "title": "設計", "description": "システム設計" },
    { "title": "実装", "description": "コーディング" },
    { "title": "検証", "description": "テストと品質確認" }
  ]
}
```

### 11. cards - カード型
```json
{
  "type": "cards",
  "title": "サービス一覧",
  "cards": [
    { "icon": "🚀", "title": "高速", "description": "処理速度3倍" },
    { "icon": "🔒", "title": "安全", "description": "暗号化対応" },
    { "icon": "💡", "title": "簡単", "description": "直感的UI" },
    { "icon": "📊", "title": "分析", "description": "リアルタイム" }
  ]
}
```

### 12. stats - 数値ハイライト
```json
{
  "type": "stats",
  "title": "導入効果",
  "stats": [
    { "value": "40%", "label": "コスト削減", "description": "前年比" },
    { "value": "3x", "label": "生産性", "description": "業界平均比" },
    { "value": "95%", "label": "満足度", "description": "利用者アンケート" }
  ]
}
```

### 13. quote - 引用
```json
{
  "type": "quote",
  "quote": "引用テキスト",
  "author": "発言者名",
  "source": "出典"
}
```

### 14. table - テーブル
```json
{
  "type": "table",
  "title": "比較表",
  "headers": ["項目", "プランA", "プランB", "プランC"],
  "rows": [
    ["価格", "¥1,000", "¥3,000", "¥5,000"],
    ["容量", "10GB", "50GB", "無制限"],
    ["サポート", "メール", "チャット", "電話"]
  ]
}
```

### 15. checklist - チェックリスト
```json
{
  "type": "checklist",
  "title": "導入チェックリスト",
  "items": [
    { "text": "要件定義完了", "checked": true },
    { "text": "環境構築", "checked": true },
    { "text": "テスト実施", "checked": false },
    { "text": "本番リリース", "checked": false }
  ]
}
```

### 16. closing - クロージング
```json
{
  "type": "closing",
  "title": "ありがとうございました",
  "message": "ご質問はお気軽にどうぞ",
  "contact": "info@example.com",
  "website": "https://example.com"
}
```

---

## インフォグラフィック生成（Gemini 3 Pro Image / Nano Banana）

データ可視化・比較・ROI等のスライドには、Gemini 3 Pro Image（Nano Banana）で生成したインフォグラフィックを `image_full` スライドとして挿入できる。

### 生成コマンド

```bash
# 1. 画像生成
python3 generate_image.py "プロンプト（日本語）" images/ファイル名.png

# 2. Driveにアップロード
./upload_image.sh images/ファイル名.png
# → https://drive.google.com/uc?id=xxxxx

# 3. JSONの image_full スライドに URL を設定
```

### プロンプトの書き方

スライドの具体的なデータを日本語でそのまま記述する。`generate_image.py` が自動で以下を付与する:
- ワイドスクリーン（16:9）指定
- 日本語テキスト指定
- ダークブルー(#1a1a2e) + ゴールド(#c8a45a) 配色

```
例: AI導入による業務変革のビフォーアフター比較。経営報告書作成：8時間→2時間（75%削減）、
    市場調査レポート：3日→半日（80%削減）。棒グラフで削減効果を視覚的に表現。
```

### 対象スライドの選定基準

| データの種類 | 生成する図 |
|---|---|
| 数値データ（stats系） | データ可視化インフォグラフィック |
| 比較・Before/After | 比較インフォグラフィック |
| ROI・コスト | 投資対効果インフォグラフィック |
| プロセス・フロー | フロー図インフォグラフィック |

通常2〜4枚程度が適切。データ系スライドの直後に `image_full` として配置する。

### 料金目安

| モデル | 1枚あたり | 月100枚 |
|---|---|---|
| Gemini 3 Pro Image (推奨) | $0.134（約¥20） | 約¥2,000 |
| Imagen 4 Fast | $0.02（約¥3） | 約¥300 |

---

## 枚数目安

| プレゼン時間 | 推奨枚数 |
|---|---|
| 5分 (LT) | 8〜10枚 |
| 15分 | 15〜20枚 |
| 30分 | 30〜40枚 |
| 60分 (研修) | 50〜70枚 |
