#!/usr/bin/env python3
"""
イチゴの旬スライドJSON構築スクリプト
designer生成画像をBase64エンコードしてJSONに埋め込む
"""

import base64
import json
import os
import sys
import glob

BASE_DIR = "/Users/gotonobumasa/Desktop/AI Agent/資料作成"
OUTPUT_DIR = os.path.join(BASE_DIR, "clients/goto/outputs")
PHOTO_DIR = os.path.join(BASE_DIR, "clients/goto/photos")
SLIDES_GEN_DIR = os.path.join(BASE_DIR, "slides-generator")

# 構成案のスライド構成に基づく期待ファイル名
# designer命名規則: slide{N}_{pattern}.png
EXPECTED_FILES = {
    1: "slide1_cover",
    2: "slide2_question",
    3: "slide3_headline",
    4: "slide4_definition",
    5: "slide5_comparison",
    6: "slide6_steps",
    7: "slide7_headline2",
    8: "slide8_list",
    9: "slide9_closing_final",
}


def find_image(slide_num):
    """スライド番号に対応する画像ファイルを検索"""
    prefix = EXPECTED_FILES[slide_num]

    search_dirs = [OUTPUT_DIR, os.path.join(SLIDES_GEN_DIR, "images")]

    for search_dir in search_dirs:
        for ext in ['.png', '.jpg', '.jpeg']:
            # _finalバージョン（写真合成後）を優先
            path = os.path.join(search_dir, f"{prefix}_final{ext}")
            if os.path.exists(path):
                return path
            # 通常バージョン
            path = os.path.join(search_dir, f"{prefix}{ext}")
            if os.path.exists(path):
                return path

    # フォールバック: slide{N}_* でワイルドカード検索
    # 構成案ファイルより新しいファイルのみ対象
    composition_mtime = os.path.getmtime(os.path.join(OUTPUT_DIR, "ichigo_no_shun_構成案.md"))
    for search_dir in search_dirs:
        matches = glob.glob(os.path.join(search_dir, f"slide{slide_num}_*.png"))
        # 構成案より新しいファイルのみ
        matches = [m for m in matches if os.path.getmtime(m) > composition_mtime]
        if matches:
            finals = [m for m in matches if '_final' in m]
            return finals[0] if finals else sorted(matches, key=os.path.getmtime, reverse=True)[0]

    return None


def encode_image(path):
    """画像をBase64エンコード"""
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def get_mime(path):
    """ファイル拡張子からMIMEタイプを返す"""
    ext = os.path.splitext(path)[1].lower()
    return {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}.get(ext, 'image/png')


def check_images():
    """全スライドの画像が揃っているかチェック"""
    missing = []
    found = {}
    for i in range(1, 10):
        path = find_image(i)
        if path:
            found[i] = path
        else:
            missing.append(i)
    return found, missing


def build_json(found_images):
    """JSONを構築"""
    slides = []

    for i in range(1, 10):
        path = found_images[i]
        b64 = encode_image(path)
        mime = get_mime(path)

        slide = {
            "type": "image_full",
            "title": "",
            "image_base64": b64,
            "image_mime": mime
        }
        slides.append(slide)

    data = {
        "title": "イチゴの旬、知ってますか？ ー元八百屋の豆知識ー",
        "theme": {
            "primary": "#1B365D",
            "secondary": "#142D4F",
            "accent": "#1B365D",
            "highlight": "#F5A623",
            "text": "#ffffff",
            "textDark": "#333333",
            "background": "#ffffff",
            "lightBg": "#F0F4F8"
        },
        "slides": slides
    }

    output_path = os.path.join(SLIDES_GEN_DIR, "examples", "ichigo_no_shun.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"JSON saved to: {output_path}")
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")
    return output_path


if __name__ == "__main__":
    if "--check" in sys.argv:
        found, missing = check_images()
        print(f"Found: {len(found)}/9 images")
        for i, path in sorted(found.items()):
            print(f"  Slide {i}: {os.path.basename(path)}")
        if missing:
            print(f"Missing: slides {missing}")
        else:
            print("All images ready!")
        sys.exit(0 if not missing else 1)

    found, missing = check_images()
    if missing:
        print(f"ERROR: Missing images for slides: {missing}")
        print("Run with --check to see details")
        sys.exit(1)

    output_path = build_json(found)
    print(f"\nReady to generate slides:")
    print(f"  cd {SLIDES_GEN_DIR}")
    print(f"  ./generate_slides.sh examples/ichigo_no_shun.json")
