#!/usr/bin/env bash
# ============================================================
# Google Slides 自動生成スクリプト
# JSONファイルをBase64エンコードしてGAS Web Appに送信
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# .env 読み込み
load_env() {
    local env_file=""
    if [ -f "$SCRIPT_DIR/.env" ]; then
        env_file="$SCRIPT_DIR/.env"
    elif [ -f "$SCRIPT_DIR/../.env" ]; then
        env_file="$SCRIPT_DIR/../.env"
    fi
    if [ -n "$env_file" ]; then
        set -a
        source "$env_file"
        set +a
    fi
}

load_env

# 引数チェック
if [ $# -lt 1 ]; then
    echo "Usage: $0 <json-file> [--open]"
    echo ""
    echo "Options:"
    echo "  --open    生成後にブラウザで開く (デフォルト: 有効)"
    exit 1
fi

JSON_FILE="$1"
AUTO_OPEN=true

if [ "${2:-}" = "--no-open" ]; then
    AUTO_OPEN=false
fi

# WEBAPP_URL チェック
if [ -z "${WEBAPP_URL:-}" ]; then
    echo "Error: WEBAPP_URL が設定されていません"
    echo ".env ファイルに WEBAPP_URL を設定してください"
    exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: ファイルが見つかりません: $JSON_FILE"
    exit 1
fi

echo "Google Slides を生成中..."
echo "  入力: $JSON_FILE"

# JSONをBase64エンコード
B64_DATA=$(base64 < "$JSON_FILE" | tr -d '\n')
DATA_SIZE=${#B64_DATA}

echo "  データサイズ: ${DATA_SIZE} bytes (Base64)"

# URLの長さ制限: 約8000文字（安全マージン）
MAX_CHUNK_SIZE=6000

if [ "$DATA_SIZE" -le "$MAX_CHUNK_SIZE" ]; then
    # 小サイズ: GETリクエスト
    echo "  データ送信中 (GET)..."

    RESPONSE=$(curl -sL -w "\n%{http_code}" \
        "${WEBAPP_URL}?data=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${B64_DATA}'))")")

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
else
    # 大サイズ: Python経由でPOST（GASリダイレクト対応）
    echo "  データ送信中 (POST)..."

    RESULT_FILE=$(mktemp)
    python3 -c "
import json, requests, sys
with open('$JSON_FILE') as f:
    data = f.read()
r = requests.post('${WEBAPP_URL}', data=data,
    headers={'Content-Type': 'application/json'},
    allow_redirects=True)
result = {'http_code': r.status_code, 'body': r.text}
with open('$RESULT_FILE', 'w') as f:
    json.dump(result, f)
"
    HTTP_CODE=$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d['http_code'])")
    BODY=$(python3 -c "import json; d=json.load(open('$RESULT_FILE')); print(d['body'])")
    rm -f "$RESULT_FILE"
fi

# レスポンス解析
if [ "${HTTP_CODE:-}" != "200" ]; then
    echo "Error: HTTP ${HTTP_CODE:-unknown}"
    echo "${BODY:-No response}"
    exit 1
fi

# JSON解析
SUCCESS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null || echo "")
ERROR=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo "")
URL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null || echo "")
SLIDE_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('slideCount',''))" 2>/dev/null || echo "")

if [ -n "$ERROR" ] && [ "$ERROR" != "None" ] && [ "$ERROR" != "" ]; then
    echo ""
    echo "Error: $ERROR"
    exit 1
fi

if [ "$SUCCESS" = "True" ] || [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "生成完了!"
    echo "  スライド数: ${SLIDE_COUNT}"
    echo "  URL: ${URL}"

    if [ "$AUTO_OPEN" = true ] && [ -n "$URL" ]; then
        if command -v open &>/dev/null; then
            open "$URL"
        elif command -v xdg-open &>/dev/null; then
            xdg-open "$URL"
        fi
    fi
else
    echo ""
    echo "Warning: 予期しないレスポンス"
    echo "$BODY"
fi
