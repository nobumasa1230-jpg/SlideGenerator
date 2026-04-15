#!/usr/bin/env bash
# ============================================================
# Google Drive 画像アップロードスクリプト
# 画像をDriveにアップロードして共有URLを返す
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

if [ $# -lt 1 ]; then
    echo "Usage: $0 <image-file>"
    echo ""
    echo "画像をGoogle Driveにアップロードし、共有URLを出力します。"
    echo "ACCESS_TOKEN が .env に設定されている必要があります。"
    exit 1
fi

IMAGE_FILE="$1"

if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: ファイルが見つかりません: $IMAGE_FILE" >&2
    exit 1
fi

# ACCESS_TOKEN チェック
if [ -z "${ACCESS_TOKEN:-}" ]; then
    echo "Error: ACCESS_TOKEN が設定されていません" >&2
    echo ".env ファイルに ACCESS_TOKEN を設定するか、以下で取得してください:" >&2
    echo "" >&2
    echo "  1. https://developers.google.com/oauthplayground/ にアクセス" >&2
    echo "  2. Drive API v3 > https://www.googleapis.com/auth/drive.file を選択" >&2
    echo "  3. Authorize APIs → Exchange authorization code for tokens" >&2
    echo "  4. Access token をコピーして .env に設定" >&2
    exit 1
fi

FILENAME=$(basename "$IMAGE_FILE")
MIME_TYPE=$(file --mime-type -b "$IMAGE_FILE")

echo "Google Drive にアップロード中..."
echo "  ファイル: $FILENAME"
echo "  MIME: $MIME_TYPE"

# メタデータ
METADATA=$(cat <<EOF
{
  "name": "${FILENAME}",
  "mimeType": "${MIME_TYPE}"
}
EOF
)

# multipart upload
RESPONSE=$(curl -s -X POST \
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -F "metadata=${METADATA};type=application/json;charset=UTF-8" \
    -F "file=@${IMAGE_FILE};type=${MIME_TYPE}")

FILE_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [ -z "$FILE_ID" ]; then
    echo "Error: アップロード失敗" >&2
    echo "$RESPONSE" >&2
    exit 1
fi

# 公開共有設定
curl -s -X POST \
    "https://www.googleapis.com/drive/v3/files/${FILE_ID}/permissions" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"role":"reader","type":"anyone"}' > /dev/null

SHARE_URL="https://drive.google.com/uc?id=${FILE_ID}"

echo "  アップロード完了!"
echo "  File ID: ${FILE_ID}"
echo "  URL: ${SHARE_URL}"
echo ""
echo "$SHARE_URL"
