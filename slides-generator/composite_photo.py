#!/usr/bin/env python3
"""
スライド画像にクライアント写真を合成するスクリプト

Usage:
    python3 composite_photo.py <slide_image> <photo> <output> [options]

Options:
    --x INT         写真の左位置 (px, default: 自動計算)
    --y INT         写真の上位置 (px, default: 自動計算)
    --width INT     写真の幅 (px, default: 300)
    --height INT    写真の高さ (px, default: 300)
    --position STR  プリセット位置: right, left, center, bottom-right (default: right)
    --shape STR     写真の形状: rect, circle, rounded, diamond (default: rounded)
    --border STR    枠線の色 (hex, default: なし)
    --border-width INT  枠線の幅 (px, default: 4)
    --shadow        影を付ける

Examples:
    # 右側に丸角写真を配置
    python3 composite_photo.py images/slide.png photos/profile.png images/output.png

    # 左側にダイヤモンド型で配置
    python3 composite_photo.py images/slide.png photos/profile.png images/output.png --position left --shape diamond

    # 指定座標にサイズ指定で配置
    python3 composite_photo.py images/slide.png photos/profile.png images/output.png --x 900 --y 150 --width 400 --height 400 --shape circle
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Error: Pillow が必要です。 pip3 install Pillow", file=sys.stderr)
    sys.exit(1)


def create_mask(size, shape):
    """指定した形状のマスクを作成"""
    w, h = size
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)

    if shape == 'circle':
        # 正円（短辺に合わせる）
        r = min(w, h)
        offset_x = (w - r) // 2
        offset_y = (h - r) // 2
        draw.ellipse([offset_x, offset_y, offset_x + r, offset_y + r], fill=255)

    elif shape == 'rounded':
        # 角丸四角形
        radius = min(w, h) // 10
        draw.rounded_rectangle([0, 0, w, h], radius=radius, fill=255)

    elif shape == 'diamond':
        # ダイヤモンド型
        cx, cy = w // 2, h // 2
        draw.polygon([
            (cx, 0),       # 上
            (w, cy),       # 右
            (cx, h),       # 下
            (0, cy),       # 左
        ], fill=255)

    else:
        # rect: マスクなし（全面）
        draw.rectangle([0, 0, w, h], fill=255)

    return mask


def add_border(img, mask, shape, border_color, border_width):
    """枠線を追加"""
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 枠線色をパース
    bc = border_color.lstrip('#')
    r, g, b = int(bc[0:2], 16), int(bc[2:4], 16), int(bc[4:6], 16)
    color = (r, g, b, 255)

    bw = border_width

    if shape == 'circle':
        rad = min(w, h)
        ox = (w - rad) // 2
        oy = (h - rad) // 2
        draw.ellipse([ox - bw, oy - bw, ox + rad + bw, oy + rad + bw], outline=color, width=bw)

    elif shape == 'rounded':
        radius = min(w, h) // 10
        draw.rounded_rectangle([-bw, -bw, w + bw, h + bw], radius=radius, outline=color, width=bw)

    elif shape == 'diamond':
        cx, cy = w // 2, h // 2
        draw.polygon([
            (cx, -bw),
            (w + bw, cy),
            (cx, h + bw),
            (-bw, cy),
        ], outline=color, width=bw)

    else:
        draw.rectangle([-bw, -bw, w + bw, h + bw], outline=color, width=bw)

    return overlay


def add_shadow(base, photo_pos, photo_size, shape):
    """ドロップシャドウを追加"""
    w, h = photo_size
    shadow_offset = 6
    shadow_blur = 10

    shadow = Image.new('RGBA', (w + shadow_blur * 2, h + shadow_blur * 2), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)

    sx, sy = shadow_blur, shadow_blur
    shadow_color = (0, 0, 0, 80)

    if shape == 'circle':
        r = min(w, h)
        ox = (w - r) // 2 + sx
        oy = (h - r) // 2 + sy
        shadow_draw.ellipse([ox, oy, ox + r, oy + r], fill=shadow_color)
    elif shape == 'rounded':
        radius = min(w, h) // 10
        shadow_draw.rounded_rectangle([sx, sy, sx + w, sy + h], radius=radius, fill=shadow_color)
    elif shape == 'diamond':
        cx, cy = w // 2 + sx, h // 2 + sy
        shadow_draw.polygon([(cx, sy), (sx + w, cy), (cx, sy + h), (sx, cy)], fill=shadow_color)
    else:
        shadow_draw.rectangle([sx, sy, sx + w, sy + h], fill=shadow_color)

    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=shadow_blur))

    px, py = photo_pos
    base.paste(shadow, (px - shadow_blur + shadow_offset, py - shadow_blur + shadow_offset), shadow)
    return base


def get_position(position, slide_size, photo_size):
    """プリセット位置から座標を計算"""
    sw, sh = slide_size
    pw, ph = photo_size
    margin = 40

    if position == 'right':
        x = sw - pw - margin
        y = (sh - ph) // 2
    elif position == 'left':
        x = margin
        y = (sh - ph) // 2
    elif position == 'center':
        x = (sw - pw) // 2
        y = (sh - ph) // 2
    elif position == 'bottom-right':
        x = sw - pw - margin
        y = sh - ph - margin
    else:
        x = sw - pw - margin
        y = (sh - ph) // 2

    return x, y


def composite(slide_path, photo_path, output_path, **kwargs):
    """メイン合成処理"""
    slide = Image.open(slide_path).convert('RGBA')
    photo = Image.open(photo_path).convert('RGBA')

    # 写真のリサイズ
    pw = kwargs.get('width', 300)
    ph = kwargs.get('height', 300)
    photo = photo.resize((pw, ph), Image.LANCZOS)

    # 位置決定
    if kwargs.get('x') is not None and kwargs.get('y') is not None:
        pos = (kwargs['x'], kwargs['y'])
    else:
        pos = get_position(kwargs.get('position', 'right'), slide.size, (pw, ph))

    shape = kwargs.get('shape', 'rounded')

    # マスク作成
    mask = create_mask((pw, ph), shape)

    # 影
    if kwargs.get('shadow', False):
        slide = add_shadow(slide, pos, (pw, ph), shape)

    # 写真を合成
    slide.paste(photo, pos, mask)

    # 枠線
    if kwargs.get('border'):
        border_overlay = add_border(photo, mask, shape,
                                     kwargs['border'],
                                     kwargs.get('border_width', 4))
        slide.paste(border_overlay, pos, border_overlay)

    # 保存
    slide.convert('RGB').save(output_path, 'PNG')
    print(f"  合成完了: {output_path}")
    print(f"  写真サイズ: {pw}x{ph}")
    print(f"  位置: {pos}")
    print(f"  形状: {shape}")

    return output_path


def main():
    parser = argparse.ArgumentParser(description='スライド画像にクライアント写真を合成')
    parser.add_argument('slide', help='スライド画像のパス')
    parser.add_argument('photo', help='写真のパス')
    parser.add_argument('output', help='出力先パス')
    parser.add_argument('--x', type=int, default=None, help='写真の左位置(px)')
    parser.add_argument('--y', type=int, default=None, help='写真の上位置(px)')
    parser.add_argument('--width', type=int, default=300, help='写真の幅(px)')
    parser.add_argument('--height', type=int, default=300, help='写真の高さ(px)')
    parser.add_argument('--position', default='right',
                        choices=['right', 'left', 'center', 'bottom-right'],
                        help='プリセット位置')
    parser.add_argument('--shape', default='rounded',
                        choices=['rect', 'circle', 'rounded', 'diamond'],
                        help='写真の形状')
    parser.add_argument('--border', default=None, help='枠線の色(hex)')
    parser.add_argument('--border-width', type=int, default=4, help='枠線の幅(px)')
    parser.add_argument('--shadow', action='store_true', help='影を付ける')

    args = parser.parse_args()

    if not Path(args.slide).exists():
        print(f"Error: スライド画像が見つかりません: {args.slide}", file=sys.stderr)
        sys.exit(1)
    if not Path(args.photo).exists():
        print(f"Error: 写真が見つかりません: {args.photo}", file=sys.stderr)
        sys.exit(1)

    composite(args.slide, args.photo, args.output,
              x=args.x, y=args.y,
              width=args.width, height=args.height,
              position=args.position, shape=args.shape,
              border=args.border, border_width=args.border_width,
              shadow=args.shadow)


if __name__ == '__main__':
    main()
