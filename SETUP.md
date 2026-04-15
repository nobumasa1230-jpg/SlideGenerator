# セットアップ手順

## アーキテクチャ

```
Claude Code → 構成案MD → JSON生成 → generate_slides.sh → GAS (doGet/Base64) → Google Slides
                ↓
          Gemini 3 Pro Image API → PNG → Base64 → JSONに埋め込み
          (または Canva MCP → PNG → URLでJSONに設定)
```

- JSONでスライド構成を定義（16種類のレイアウト対応）
- Base64エンコードしてGASのWebアプリURLにGETリクエスト（大サイズはチャンク分割）
- GASがデコード → Google Slides APIでスライド描画
- インフォグラフィックは Gemini API（推奨）または Canva MCP で生成し、`image_full`スライドとして挿入

---

## 前提条件

- Node.js（clasp用）
- clasp（`npm install -g @google/clasp`）
- Python 3（Base64エンコード・レスポンス解析用）
- google-genai（`pip3 install google-genai`、Gemini画像生成用）
- Canva MCP接続（任意、Claude Code経由）

---

## 1. clasp ログイン

```bash
clasp login
```

ブラウザが開くのでGoogleアカウントで認証。

## 2. GASプロジェクトを作成

```bash
cd slides-generator/gas
clasp create --type standalone --title "Slides Generator"
```

## 3. コードをプッシュ

```bash
clasp push --force
```

`Code.gs` と `appsscript.json` がGASにアップロードされる。

## 4. GASエディタで権限を承認

```bash
clasp open
```

1. 関数セレクタで `testGenerate` を選択
2. ▶ 実行をクリック
3. 「承認が必要です」→ 許可
4. ログにスライドURLが表示されれば成功

## 5. ウェブアプリとしてデプロイ

GASエディタで：

1. 「デプロイ」→「新しいデプロイ」
2. 歯車アイコン → 種類「**ウェブアプリ**」を選択
3. 次のユーザーとして実行：「**自分**」
4. アクセスできるユーザー：「**全員**」
5. 「デプロイ」をクリック
6. 表示されるウェブアプリURLをコピー

## 6. .env ファイルを作成

```bash
cd slides-generator
cp .env.example .env
```

`.env` を編集：

```
SCRIPT_ID="your-script-id"
WEBAPP_URL="https://script.google.com/macros/s/xxxxx/exec"
ACCESS_TOKEN=""
gemini_apikey="your-gemini-api-key"
```

- `WEBAPP_URL` にステップ5でコピーしたURLを貼り付け
- `gemini_apikey` は [Google AI Studio](https://aistudio.google.com) で取得

## 7. テスト実行

```bash
./generate_slides.sh examples/test.json
```

成功すると：

```
Google Slides を生成中...
  データ送信中...

✅ 生成完了!
📊 スライド数: 9
🔗 URL: https://docs.google.com/open?id=xxxxx
```

ブラウザで自動的にスライドが開く。

---

## 対応レイアウト（16種類）

| タイプ | 用途 |
|---|---|
| title | タイトルスライド |
| section | セクション区切り |
| text | テキスト |
| bullets | 箇条書き |
| two_column | 2カラム |
| comparison | 比較表 |
| image_text | 画像+テキスト（左右分割） |
| image_full | 画像全面表示（インフォグラフィック向け） |
| timeline | タイムライン |
| process | プロセス図 |
| cards | カード型 |
| stats | 数値ハイライト |
| quote | 引用 |
| table | テーブル |
| checklist | チェックリスト |
| closing | クロージング |

---

## ロゴの挿入

`/ロゴ/` ディレクトリにPNG/JPGファイルを配置すると、全スライドの右上にロゴが表示される。
JSONの `logo` フィールドにBase64エンコードした画像を埋め込む方式。

---

## インフォグラフィック生成

### 方法A: Gemini 3 Pro Image API（推奨）

高品質・低コスト・クォータ制限が緩い。

#### 料金
- $0.134/枚（1K-2K解像度）、約¥20/枚
- 月100枚でも約¥2,000

#### 生成スクリプト

```bash
python3 generate_image.py "プロンプト" images/output.png
```

`generate_image.py` が自動で以下を行う:
- .env から `gemini_apikey` を読み込み
- 正方形・日本語・ダークブルー&ゴールド配色をシステムプロンプトに含む
- Gemini 3 Pro Image で画像生成 → PNGで保存

#### JSONへの埋め込み

生成した画像はBase64エンコードしてJSONの `image_full` スライドに埋め込む:
```json
{
  "type": "image_full",
  "title": "タイトル",
  "image_base64": "（Base64文字列）",
  "image_mime": "image/png",
  "caption": "キャプション"
}
```

### 方法B: Canva MCP

デザインテンプレートが豊富。クォータ制限あり。

#### 生成ルール
- `design_type`: `instagram_post`（正方形1080x1080が保証される。`infographic`は縦長固定のため不可）
- テキストは日本語表示: プロンプトに `All text must be in Japanese.` を含める
- エクスポート: PNG 800x800

#### 生成手順
1. `mcp__claude_ai_Canva__generate-design` で `instagram_post` 指定して生成（1枚ずつ順番に）
2. `mcp__claude_ai_Canva__create-design-from-candidate` で確定
3. `mcp__claude_ai_Canva__export-design` で PNG 800x800 エクスポート
4. JSONの `image_full` スライドに URL を設定:
```json
{
  "type": "image_full",
  "title": "タイトル",
  "image_url": "https://export-download.canva.com/...",
  "caption": "キャプション"
}
```

#### 注意事項
- Canva APIにはクォータ制限あり（超過時は1〜24時間で回復）
- エクスポートURLは一時的（数時間で期限切れ）→ エクスポート後すぐにスライド生成すること
- 並行リクエストはタイムアウトしやすい → 1枚ずつ順番に実行

### 方法A vs B 比較

| | Gemini（推奨） | Canva |
|---|---|---|
| コスト | 従量課金 ¥20/枚 | Pro ¥1,500/月（500回） |
| クォータ | 緩い | 厳しい（500回/月） |
| 画像品質 | 高品質、日本語テキスト正確 | テンプレートベース |
| 正方形 | プロンプトで指定可 | `instagram_post`で保証 |
| URLの期限 | なし（Base64埋め込み） | 数時間で期限切れ |
| セットアップ | APIキーのみ | MCP接続必要 |

---

## スキル（自動実行）

`/スライド作成` コマンドで以下が自動実行される：

1. タイトル・ターゲット層のヒアリング
2. 構成案MDファイルの作成
3. Gemini（またはCanva）でインフォグラフィック生成
4. ロゴ付きJSONの生成
5. Google Slidesの自動生成

---

## コード更新時の手順

GASコードを修正した場合：

```bash
cd gas
clasp push --force
```

その後、GASエディタで「デプロイを管理」→ 鉛筆 → バージョン「新しいバージョン」→「デプロイ」。

**重要**: clasp push だけではデプロイに反映されない。必ず「新しいバージョン」で再デプロイすること。

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `スクリプト関数が見つかりません: doGet` | デプロイが古いバージョン | 新しいバージョンで再デプロイ |
| `SyntaxError: Unexpected token` | JSON破損 | JSONファイルの構文を確認 |
| Googleログイン画面が返る | アクセス設定が「自分のみ」 | 「全員」に変更して再デプロイ |
| `400 Bad Request` | URLが長すぎ | 自動でチャンク分割方式に切り替わるので通常は発生しない |
| 権限エラー | GASの承認が未完了 | GASエディタで `testGenerate` を手動実行して承認 |
| `無効な16進数の文字列` | カラーコードが8桁（ARGB） | 6桁の16進数カラーコードを使用する |
| Gemini API error | APIキー未設定 or 無効 | .env の `gemini_apikey` を確認 |
| Canva quota limit | Canva API制限超過 | 1〜24時間待つ、またはGeminiに切り替え |
| Canva timeout | 並行リクエスト過多 | 1枚ずつ順番に生成する |
