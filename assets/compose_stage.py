"""Compose stage art from the generated orchard paintings. Image gen was capped."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/workspace")
SPR = ROOT / "assets" / "sprites"
OUT = ROOT / "public" / "game"
OUT.mkdir(parents=True, exist_ok=True)


def copy_frames():
    mapping = {
        "pip-idle/idle-1.png": "pip-idle-0.png",
        "pip-idle/idle-2.png": "pip-idle-1.png",
        "pip-idle/idle-3.png": "pip-idle-2.png",
        "pip-idle/idle-4.png": "pip-idle-3.png",
        "pip-run/run-1.png": "pip-run-0.png",
        "pip-run/run-2.png": "pip-run-1.png",
        "pip-run/run-3.png": "pip-run-2.png",
        "pip-run/run-4.png": "pip-run-3.png",
        "pip-jump/jump-1.png": "pip-jump-0.png",
        "pip-jump/jump-2.png": "pip-jump-1.png",
        "pip-jump/jump-3.png": "pip-jump-2.png",
        "pip-jump/jump-4.png": "pip-jump-3.png",
        "nub/walk-1.png": "nub-0.png",
        "nub/walk-2.png": "nub-1.png",
        "nub/walk-3.png": "nub-2.png",
        "nub/walk-4.png": "nub-3.png",
        "seed/projectile-1.png": "seed-0.png",
        "seed/projectile-2.png": "seed-1.png",
        "seed/projectile-3.png": "seed-2.png",
        "seed/projectile-4.png": "seed-3.png",
        "nub-flat/clean.png": "nub-flat.png",
        "crate/clean.png": "crate.png",
        "lantern/clean.png": "lantern.png",
        "used/clean.png": "used.png",
    }
    for src, dst in mapping.items():
        Image.open(SPR / src).save(OUT / dst)


def brownify(rgb: np.ndarray) -> np.ndarray:
    lum = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.55 + rgb[..., 2] * 0.15
    lum = lum[..., None]
    soil = np.stack(
        [
            np.clip(78 + lum[..., 0] * 0.55, 0, 210),
            np.clip(46 + lum[..., 0] * 0.32, 0, 150),
            np.clip(24 + lum[..., 0] * 0.14, 0, 90),
        ],
        axis=-1,
    )
    return soil.astype(np.uint8)


def ground_strips():
    grass = np.asarray(Image.open(SPR / "ground" / "raw.jpg").convert("RGB"))
    h, w, _ = grass.shape
    # Mirror so the strip loops: both outer edges are the original left edge.
    mirrored = np.concatenate([grass, grass[:, ::-1]], axis=1)
    mw = mirrored.shape[1]
    strip_h = 128
    ys = np.linspace(0, 1, strip_h)
    # Sample a horizontal band of the painting into the strip.
    src_y = np.clip((ys * (h * 0.55)).astype(int), 0, h - 1)
    band = mirrored[src_y]  # (strip_h, mw, 3)
    soil = brownify(band)
    t = ys[:, None, None]
    grass_w = np.clip((0.34 - t) / 0.34, 0, 1)
    lip = np.clip(1 - np.abs(t - 0.36) / 0.08, 0, 1)
    lip_col = np.array([62, 44, 28], dtype=np.float32)
    mixed = band.astype(np.float32) * grass_w + soil.astype(np.float32) * (1 - grass_w)
    mixed = mixed * (1 - lip * 0.45) + lip_col * (lip * 0.45)
    surface = np.clip(mixed, 0, 255).astype(np.uint8)
    # Fill continues the bottom soil row so stacked tiles meet.
    fill = soil.copy()
    fill[0] = surface[-1]
    fade = np.linspace(0, 1, 18)[:, None, None]
    fill[:18] = (
        surface[-1:].astype(np.float32) * (1 - fade) + fill[:18].astype(np.float32) * fade
    ).astype(np.uint8)
    Image.fromarray(surface).save(OUT / "ground-top.png")
    Image.fromarray(fill).save(OUT / "ground-fill.png")
    # 4-tile seam preview
    sw = 64
    preview = Image.new("RGB", (sw * 4, strip_h * 2))
    top_im = Image.fromarray(surface)
    fill_im = Image.fromarray(fill)
    for i in range(4):
        preview.paste(top_im.crop((i * sw, 0, (i + 1) * sw, strip_h)), (i * sw, 0))
        preview.paste(fill_im.crop((i * sw, 0, (i + 1) * sw, strip_h)), (i * sw, strip_h))
    preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST).save(
        ROOT / "assets" / "ground-seam-preview.png"
    )


def sky_and_hills():
    w, h = 1680, 720
    ys = np.linspace(0, 1, h)[:, None, None]
    top = np.array([110, 186, 214], dtype=np.float32)
    mid = np.array([246, 214, 170], dtype=np.float32)
    bot = np.array([232, 168, 112], dtype=np.float32)
    u = np.clip(ys / 0.72, 0, 1)
    col = top * (1 - u) + mid * u
    low = np.clip((ys - 0.72) / 0.28, 0, 1)
    col = col * (1 - low) + bot * low
    sky = np.repeat(col, w, axis=1)
    # Sun
    yy, xx = np.mgrid[0:h, 0:w]
    sun = np.exp(-(((xx - w * 0.72) ** 2) / (180**2) + ((yy - h * 0.62) ** 2) / (70**2)))
    sky += np.array([40, 24, 6]) * sun[..., None]
    sky_img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8))
    clouds = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(clouds)
    puffs = [
        (180, 150, 220, 70),
        (260, 140, 160, 56),
        (980, 120, 260, 80),
        (1120, 130, 180, 60),
        (1400, 180, 200, 64),
        (560, 200, 140, 46),
    ]
    for x, y, rw, rh in puffs:
        draw.ellipse((x, y, x + rw, y + rh), fill=(255, 248, 236, 150))
        draw.ellipse((x + rw * 0.3, y - rh * 0.35, x + rw * 0.85, y + rh * 0.55), fill=(255, 250, 242, 140))
    clouds = clouds.filter(ImageFilter.GaussianBlur(8))
    sky_img = sky_img.convert("RGBA")
    sky_img.alpha_composite(clouds)
    sky_img.convert("RGB").save(OUT / "sky.png", quality=92)

    grass = np.asarray(Image.open(SPR / "ground" / "raw.jpg").convert("RGB").resize((w, h), Image.Resampling.LANCZOS))
    # Far hills
    mask = np.zeros((h, w), dtype=np.float32)
    for x in range(w):
        edge = int(h * 0.58 + 26 * np.sin(x * 0.006) + 14 * np.sin(x * 0.017 + 1.2))
        mask[edge:, x] = 1
    sage = np.array([126, 156, 112], dtype=np.float32)
    hill = grass.astype(np.float32) * 0.35 + sage * 0.65
    hill_img = Image.fromarray(np.clip(hill, 0, 255).astype(np.uint8)).convert("RGBA")
    alpha = Image.fromarray((mask * 255).astype(np.uint8))
    hill_img.putalpha(alpha)
    hill_img.save(OUT / "hills.png")

    # Trees: canopies of darkened grass, trunks from wood tone
    tree = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(tree)
    canopy = Image.fromarray(
        np.clip(grass.astype(np.float32) * 0.55 + np.array([40, 90, 48]) * 0.45, 0, 255).astype(np.uint8)
    )
    rng = np.random.default_rng(3)
    xs = [80, 260, 430, 640, 860, 1080, 1280, 1500]
    for x in xs:
        cw, ch = 150 + int(rng.integers(0, 40)), 110 + int(rng.integers(0, 30))
        base_y = int(h * 0.78)
        sx = int(x) % (w - cw)
        crop = canopy.crop((sx, 80, sx + cw, 80 + ch))
        blob = Image.new("L", (cw, ch), 0)
        ImageDraw.Draw(blob).ellipse((0, 0, cw - 1, ch - 1), fill=255)
        blob = blob.filter(ImageFilter.GaussianBlur(1.2))
        layer = Image.merge("RGBA", (*crop.split(), blob))
        tree.alpha_composite(layer, (x - cw // 2, base_y - ch))
        trunk_h = 70
        tdraw.rectangle(
            (x - 7, base_y - 16, x + 7, base_y + trunk_h),
            fill=(110, 72, 40, 230),
        )
    tree.save(OUT / "trees.png")


def props():
    crate = Image.open(SPR / "crate" / "clean.png").convert("RGBA")
    arr = np.array(crate)
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 20)
    wood = arr[ys.min() : ys.max(), xs.min() : xs.max()]
    # Lower planks, avoid the leaf in the upper center.
    ph = wood.shape[0]
    band = wood[int(ph * 0.62) : int(ph * 0.82)]
    plank = Image.fromarray(band).resize((384, 72), Image.Resampling.LANCZOS)
    plank.save(OUT / "plank.png")

    # Stakes from wood grain
    stake = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    grain = Image.fromarray(wood[:, :40]).resize((36, 120), Image.Resampling.LANCZOS)
    draw_layer = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    positions = [(18, 150), (62, 150), (108, 150)]
    heights = [92, 120, 78]
    for (x, foot), ht in zip(positions, heights):
        mask = Image.new("L", (36, ht), 0)
        ImageDraw.Draw(mask).polygon([(18, 0), (34, ht - 1), (2, ht - 1)], fill=255)
        piece = grain.resize((36, ht), Image.Resampling.LANCZOS)
        piece.putalpha(mask)
        draw_layer.alpha_composite(piece, (x, foot - ht))
    stake.alpha_composite(draw_layer)
    stake.save(OUT / "stake.png")

    # Ribbon flag: wood pole + teal banner
    flag = Image.new("RGBA", (220, 460), (0, 0, 0, 0))
    pole_grain = Image.fromarray(wood[:, 8:28]).resize((22, 420), Image.Resampling.LANCZOS)
    flag.alpha_composite(pole_grain, (40, 30))
    banner = Image.new("RGBA", (220, 460), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(banner)
    bdraw.polygon([(62, 48), (190, 78), (176, 118), (62, 108)], fill=(31, 122, 78, 255))
    bdraw.polygon([(62, 108), (176, 118), (168, 148), (62, 132)], fill=(22, 92, 60, 255))
    bdraw.line([(70, 70), (180, 96)], fill=(255, 244, 224, 230), width=4)
    flag.alpha_composite(banner)
    flag.save(OUT / "flag.png")


if __name__ == "__main__":
    copy_frames()
    ground_strips()
    sky_and_hills()
    props()
    print("composed", len(list(OUT.iterdir())), "files")
