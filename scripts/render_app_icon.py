"""Render the Integra Markets app icon + splash from the design spec in
integra-app-icon.tsx (black background, emerald-500 border + dot + line).

Run: python3 scripts/render_app_icon.py

Outputs (all overwritten):
    assets/icon.png              1024x1024
    assets/adaptive-icon.png     1024x1024
    assets/notification-icon.png 1024x1024  (same as icon; iOS masks it anyway)
    assets/favicon.png             48x48
    assets/splash.png            1284x2778  (iPhone Pro Max, black bg, centered)
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

BLACK = (0, 0, 0)
EMERALD_500 = (16, 185, 129)   # tailwind emerald-500 = #10b981

REPO_ROOT = Path(__file__).resolve().parents[1]
ASSETS = REPO_ROOT / "assets"


def render_icon(size: int) -> Image.Image:
    """Render the icon at `size`x`size` following integra-app-icon.tsx spec."""
    img = Image.new("RGB", (size, size), BLACK)
    draw = ImageDraw.Draw(img)

    # Percentages taken directly from integra-app-icon.tsx
    border_width = max(2, int(size * 0.015))
    inner_size = int(size * 0.70)
    corner_radius = int(size * 0.10)
    inner_corner = int(corner_radius * 0.75)

    inner_x = (size - inner_size) // 2
    inner_y = (size - inner_size) // 2

    draw.rounded_rectangle(
        (inner_x, inner_y, inner_x + inner_size, inner_y + inner_size),
        radius=inner_corner,
        outline=EMERALD_500,
        width=border_width,
    )

    dot_size    = int(size * 0.06)
    line_width  = int(size * 0.06)
    line_height = int(size * 0.20)
    gap_size    = int(size * 0.04)
    shape_radius = max(1, int(corner_radius * 0.1))

    content_h = dot_size + gap_size + line_height
    content_y = (size - content_h) // 2

    dot_x = (size - dot_size) // 2
    draw.rounded_rectangle(
        (dot_x, content_y, dot_x + dot_size, content_y + dot_size),
        radius=shape_radius,
        fill=EMERALD_500,
    )

    line_x = (size - line_width) // 2
    line_y = content_y + dot_size + gap_size
    draw.rounded_rectangle(
        (line_x, line_y, line_x + line_width, line_y + line_height),
        radius=shape_radius,
        fill=EMERALD_500,
    )

    return img


def render_splash(width: int, height: int) -> Image.Image:
    """Splash: black background, centered logo at ~30% of smaller dimension."""
    img = Image.new("RGB", (width, height), BLACK)
    logo_size = int(min(width, height) * 0.30)
    logo = render_icon(logo_size)
    x = (width  - logo_size) // 2
    y = (height - logo_size) // 2
    img.paste(logo, (x, y))
    return img


def main() -> None:
    outputs: list[tuple[str, Image.Image]] = [
        ("icon.png",              render_icon(1024)),
        ("adaptive-icon.png",     render_icon(1024)),
        ("notification-icon.png", render_icon(1024)),
        ("favicon.png",           render_icon(48)),
        ("splash.png",            render_splash(1284, 2778)),
    ]
    for name, img in outputs:
        path = ASSETS / name
        img.save(path, "PNG", optimize=True)
        print(f"  wrote {path.relative_to(REPO_ROOT)}  {img.size[0]}x{img.size[1]}  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
