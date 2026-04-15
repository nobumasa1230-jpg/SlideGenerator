#!/usr/bin/env python3
"""
Gemini 2.0 Flash (Nano Banana Pro 2) を使ったインフォグラフィック画像生成

Usage:
    python3 generate_image.py "プロンプト" output.png
    python3 generate_image.py "プロンプト" output.png --upload
"""

import sys
import os
import base64
import json
from pathlib import Path

# .env読み込み（python-dotenvなしで対応）
def load_env():
    env_paths = [
        Path(__file__).parent / '.env',
        Path(__file__).parent.parent / '.env',
    ]
    for env_path in env_paths:
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, _, value = line.partition('=')
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        os.environ.setdefault(key, value)
            break

load_env()

def generate_image(prompt: str, output_path: str) -> str:
    """Gemini APIで画像を生成してPNGで保存"""
    from google import genai
    from google.genai import types

    api_key = os.environ.get('Gemini_apikey') or os.environ.get('gemini_apikey') or os.environ.get('GEMINI_APIKEY')
    if not api_key:
        print("Error: Gemini API key not found in .env", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    system_prompt = (
        "You are an expert infographic designer. "
        "Create a visually stunning widescreen (16:9 aspect ratio) infographic image. "
        "The image MUST be in 16:9 landscape format (e.g. 1280x720 or 1920x1080). "
        "Use a dark blue (#1a1a2e) background with gold (#c8a45a) accents. "
        "All text in the image MUST be in Japanese. "
        "Use clean, modern typography with Noto Sans JP style. "
        "Include data visualizations, icons, and clear visual hierarchy. "
        "The design should be professional and suitable for business presentations."
    )

    full_prompt = system_prompt + "\n\nCreate an infographic about: " + prompt

    print(f"  Gemini API で画像を生成中...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=full_prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # レスポンスから画像を抽出
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_data = part.inline_data.data
            mime_type = part.inline_data.mime_type

            # 出力ディレクトリ作成
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

            # PNG保存
            with open(output_path, 'wb') as f:
                f.write(image_data)

            print(f"  画像を保存: {output_path}")
            print(f"  MIME: {mime_type}")
            print(f"  サイズ: {len(image_data):,} bytes")
            return output_path

    print("Error: No image in response", file=sys.stderr)
    sys.exit(1)


def image_to_base64(image_path: str) -> str:
    """画像ファイルをBase64文字列に変換"""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_image.py \"プロンプト\" output.png [--base64]")
        sys.exit(1)

    prompt = sys.argv[1]
    output_path = sys.argv[2]

    print(f"Gemini インフォグラフィック生成")
    print(f"  プロンプト: {prompt[:60]}...")

    generate_image(prompt, output_path)

    # --base64 オプション: Base64も出力
    if '--base64' in sys.argv:
        b64 = image_to_base64(output_path)
        b64_path = output_path + '.base64'
        with open(b64_path, 'w') as f:
            f.write(b64)
        print(f"  Base64保存: {b64_path}")

    print("  完了!")


if __name__ == '__main__':
    main()
