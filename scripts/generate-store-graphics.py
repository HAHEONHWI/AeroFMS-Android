"""Builds Google Play listing graphics (headline + phone mockup) from real app screenshots.

Usage: python3 scripts/generate-store-graphics.py <screenshots-dir> <out-dir>
Input:  <lang>-NN-<name>.png phone screenshots (1080x2160) captured from the app.
Output: <out-dir>/<lang>/NN-<name>.png at 1080x1920 (9:16, within Play's 2:1 limit).
Fonts: Apple SD Gothic Neo (macOS system font) for ko/en copy.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
BG = (11, 16, 24)
ACCENT = (79, 179, 169)
TEXT = (236, 241, 247)
MUTED = (160, 174, 194)
BEZEL = (40, 52, 72)
FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
BOLD, MEDIUM = 6, 2

# name -> {lang: (headline, subline)}
COPY: dict[str, dict[str, tuple[str, str]]] = {
    '01-home': {
        'ko': ('8개 기종의 FMC·MCDU를\n한 앱에서', '보잉 737·777·787, 에어버스 A320·A330·A350'),
        'en': ('8 airliner FMS\nin one app', 'Boeing 737, 777, 787 · Airbus A320, A330, A350'),
    },
    '02-boeing-route': {
        'ko': ('실제처럼 입력하는\n보잉 FMC', '항로·에어웨이 입력부터 ACT/MOD/EXEC까지'),
        'en': ('Program a Boeing FMC\nfor real', 'Routes, airways and ACT / MOD / EXEC'),
    },
    '03-perf-init': {
        'ko': ('성능 입력과\n순항 고도 계획', 'ZFW·연료·코스트 인덱스로 TOC/TOD 예측'),
        'en': ('Performance and\ncruise planning', 'ZFW, fuel and cost index drive TOC / TOD'),
    },
    '04-map-simulation': {
        'ko': ('지도로 확인하고\n직접 비행해 보기', '내장 시뮬레이션이 비행계획대로 비행합니다'),
        'en': ('See it on the map,\nthen fly it', 'The built-in simulation flies your plan'),
    },
    '05-airbus-tmpy': {
        'ko': ('에어버스 MCDU\n임시 비행계획', '측면 수정과 INSERT / ERASE 흐름 그대로'),
        'en': ('Airbus MCDU\ntemporary flight plans', 'Lateral revisions with INSERT / ERASE'),
    },
    '06-academy-lesson': {
        'ko': ('눌러야 할 키를 알려주는\n단계별 레슨', '초보자부터 시뮬레이터 사용자까지'),
        'en': ('Guided lessons that\nshow the next key', 'From first steps to full route programming'),
    },
    '07-flight-data': {
        'ko': ('실시간 비행 정보로\n결과 확인', '비행 단계·고도·속도·LNAV/VNAV 상태'),
        'en': ('Live flight data\nas you fly', 'Phase, altitude, speed, LNAV / VNAV'),
    },
    '08-modern-view': {
        'ko': ('Classic과 Modern\n두 가지 화면', '같은 FMS 데이터를 쉬운 폼으로도 조작'),
        'en': ('Classic CDU or\nModern view', 'The same FMS data in an easy form layout'),
    },
}


def background() -> Image.Image:
    """Flat app background colour (no gradients or glows)."""
    return Image.new('RGB', (W, H), BG)


def phone(shot: Image.Image, width: int) -> Image.Image:
    """Screenshot inside a simple rounded bezel (no third-party device artwork)."""
    pad = round(width * 0.035)
    screen_w = width - 2 * pad
    screen_h = round(shot.height * screen_w / shot.width)
    screen = shot.convert('RGB').resize((screen_w, screen_h), Image.LANCZOS)
    body = Image.new('RGBA', (width, screen_h + 2 * pad), (0, 0, 0, 0))
    radius = round(width * 0.11)
    ImageDraw.Draw(body).rounded_rectangle([0, 0, body.width - 1, body.height - 1], radius=radius, fill=BEZEL + (255,))
    ImageDraw.Draw(body).rounded_rectangle([3, 3, body.width - 4, body.height - 4], radius=radius - 3, fill=(12, 16, 22, 255))
    mask = Image.new('L', screen.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, screen_w - 1, screen_h - 1], radius=radius - pad, fill=255)
    body.paste(screen, (pad, pad), mask)
    return body


def render(shot_path: Path, headline: str, subline: str) -> Image.Image:
    canvas = background().convert('RGBA')
    d = ImageDraw.Draw(canvas)
    head_font = ImageFont.truetype(FONT, 86, index=BOLD)
    sub_font = ImageFont.truetype(FONT, 40, index=MEDIUM)
    y = 150
    d.rounded_rectangle([W / 2 - 46, y - 46, W / 2 + 46, y - 38], radius=4, fill=ACCENT)
    for line in headline.split('\n'):
        w = d.textlength(line, font=head_font)
        d.text(((W - w) / 2, y), line, font=head_font, fill=TEXT)
        y += 108
    w = d.textlength(subline, font=sub_font)
    d.text(((W - w) / 2, y + 16), subline, font=sub_font, fill=MUTED)

    device = phone(Image.open(shot_path), 760)
    top = y + 120
    shadow = Image.new('RGBA', (device.width + 120, device.height + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([60, 70, device.width + 60, device.height + 70], radius=90, fill=(0, 0, 0, 190))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    x = (W - device.width) // 2
    canvas.alpha_composite(shadow, (x - 60, top - 60))
    # The phone runs off the bottom edge, like most store listings.
    canvas.alpha_composite(device.crop((0, 0, device.width, min(device.height, H - top))), (x, top))
    return canvas.convert('RGB')


def main() -> None:
    shots = Path(sys.argv[1])
    out = Path(sys.argv[2])
    for name, langs in COPY.items():
        for lang, (headline, subline) in langs.items():
            src = shots / f'{lang}-{name}.png'
            if not src.exists():
                raise SystemExit(f'missing screenshot: {src}')
            dest = out / lang / f'{name}.png'
            dest.parent.mkdir(parents=True, exist_ok=True)
            render(src, headline, subline).save(dest, optimize=True)
            print('wrote', dest)


if __name__ == '__main__':
    main()
