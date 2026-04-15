#!/usr/bin/env python3
"""画像をBase64エンコードしてJSONのプレースホルダーを置換する"""

import base64
import json
import sys
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(OUTPUT_DIR, "ichigo_business_slides.json")

# スライド番号 → 画像ファイルのマッピング
IMAGE_MAP = {
    "PLACEHOLDER_SLIDE1": None,
    "PLACEHOLDER_SLIDE2": None,
    "PLACEHOLDER_SLIDE3": None,
    "PLACEHOLDER_SLIDE4": None,
    "PLACEHOLDER_SLIDE5": None,
}

def find_images():
    """outputs ディレクトリから今回の画像を検索"""
    files = os.listdir(OUTPUT_DIR)
    # 新しい命名規則を優先的に探す
    patterns = {
        "PLACEHOLDER_SLIDE1": ["s01_cover", "slide1_cover_v2", "ichigo_s01"],
        "PLACEHOLDER_SLIDE2": ["s02_question", "slide2_question_v2", "ichigo_s02"],
        "PLACEHOLDER_SLIDE3": ["s03_comparison", "slide3_comparison", "ichigo_s03"],
        "PLACEHOLDER_SLIDE4": ["s04_steps", "slide4_steps", "ichigo_s04"],
        "PLACEHOLDER_SLIDE5": ["s05_cards", "slide5_cards", "ichigo_s05"],
    }

    for placeholder, prefixes in patterns.items():
        for prefix in prefixes:
            for f in files:
                if f.startswith(prefix) and f.endswith(".png"):
                    IMAGE_MAP[placeholder] = os.path.join(OUTPUT_DIR, f)
                    break
            if IMAGE_MAP[placeholder]:
                break

    return IMAGE_MAP

def embed():
    with open(JSON_FILE) as f:
        data = json.load(f)

    json_str = json.dumps(data)

    find_images()

    missing = []
    for placeholder, path in IMAGE_MAP.items():
        if path and os.path.exists(path):
            with open(path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode('utf-8')
            json_str = json_str.replace(placeholder, b64)
            print(f"  Embedded: {os.path.basename(path)}")
        else:
            missing.append(placeholder)
            print(f"  Missing: {placeholder}")

    if missing:
        print(f"\nWARNING: {len(missing)} images missing: {missing}")
        return False

    data = json.loads(json_str)
    with open(JSON_FILE, 'w') as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"\nAll images embedded into {JSON_FILE}")
    return True

if __name__ == "__main__":
    success = embed()
    sys.exit(0 if success else 1)
