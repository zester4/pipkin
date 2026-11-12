"""Distinct Moon Grove and Storm Crown plates, plus shaded beast sprites.

Orchard files are only a fine grain source. Silhouettes, color, and ground
structure are new.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

GAME = Path("/workspace/public/game")
W, H = 1680, 720


def save_rgb(path: Path, arr: np.ndarray) -> None:
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").save(path, optimize=True)


def save_rgba(path: Path, arr: np.ndarray) -> None:
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path, optimize=True)


def fbm(h: int, w: int, seed: int, octaves: int = 5) -> np.ndarray:
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    total = 0.0
    amp = 1.0
    for i in range(octaves):
        gh = max(2, h // (2 ** (i + 3)))
        gw = max(2, w // (2 ** (i + 3)))
        grid = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((grid * 255).astype(np.uint8), "L").resize((w, h), Image.Resampling.BICUBIC)
        out += amp * (np.asarray(img).astype(np.float32) / 255.0)
        total += amp
        amp *= 0.55
    return out / total


def blur_arr(arr: np.ndarray, radius: float) -> np.ndarray:
    img = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8), "L")
    img = img.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(img).astype(np.float32) / 255.0


def lerp_color(a: np.ndarray, b: np.ndarray, t: np.ndarray | float) -> np.ndarray:
    tt = np.asarray(t, np.float32)
    if tt.ndim == 2:
        tt = tt[..., None]
    return a * (1 - tt) + b * tt


def grain_tile(h: int, w: int, seed: int) -> np.ndarray:
    src = np.asarray(Image.open(GAME / "trees.png").convert("L")).astype(np.float32) / 255.0
    soft = blur_arr(src, 4)
    g = np.clip(src - soft, -0.25, 0.25)
    gh, gw = g.shape
    yy = (np.arange(h)[:, None] + seed * 19) % gh
    xx = (np.arange(w)[None, :] + seed * 37) % gw
    return g[yy, xx]


def sky_plate(kind: str) -> np.ndarray:
    n = fbm(H, W, 11 if kind == "grove" else 29, 6)
    n2 = fbm(H, W, 13 if kind == "grove" else 31, 4)
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
    if kind == "grove":
        col = lerp_color(np.array([7, 10, 28], np.float32), np.array([26, 34, 88], np.float32), np.clip(y / 0.5, 0, 1))
        col = lerp_color(col, np.array([54, 40, 92], np.float32), np.clip((y - 0.38) / 0.34, 0, 1))
        col = lerp_color(col, np.array([32, 86, 102], np.float32), np.clip((y - 0.75) / 0.25, 0, 1))
        cloud = blur_arr(np.clip((n - 0.5) * 3.1, 0, 1) * np.clip(1.2 - y, 0, 1), 1.1)
        col = lerp_color(col, np.array([108, 74, 132], np.float32), cloud * 0.75)
        col = lerp_color(col, np.array([168, 156, 196], np.float32), cloud * n2 * 0.4)
        yy, xx = np.mgrid[0:H, 0:W]
        d = np.sqrt((xx - 460) ** 2 + (yy - 160) ** 2)
        halo = np.clip(1 - d / 280, 0, 1) ** 1.7
        moon = np.clip(1 - (d - 74) / 8, 0, 1)
        col = lerp_color(col, np.array([214, 156, 92], np.float32), halo * 0.5)
        col = lerp_color(col, np.array([246, 230, 186], np.float32) * (0.94 + 0.06 * n2)[..., None], moon)
        rng = np.random.default_rng(4)
        stars = np.zeros((H, W), np.float32)
        for sx, sy, sr in rng.random((110, 3)):
            px, py = int(sx * W * 0.92 + 20), int(sy * H * 0.55)
            rad = 0.8 + sr * 1.5
            y0, y1 = max(0, py - 3), min(H, py + 4)
            x0, x1 = max(0, px - 3), min(W, px + 4)
            yy2, xx2 = np.mgrid[y0:y1, x0:x1]
            stars[y0:y1, x0:x1] = np.maximum(
                stars[y0:y1, x0:x1],
                np.clip(1 - np.sqrt((xx2 - px) ** 2 + (yy2 - py) ** 2) / rad, 0, 1),
            )
        col = lerp_color(col, np.array([250, 242, 220], np.float32), stars)
    else:
        col = lerp_color(np.array([14, 20, 28], np.float32), np.array([36, 62, 78], np.float32), np.clip(y / 0.55, 0, 1))
        col = lerp_color(col, np.array([18, 32, 38], np.float32), np.clip((y - 0.45) / 0.3, 0, 1))
        col = lerp_color(col, np.array([72, 54, 40], np.float32), np.clip((y - 0.8) / 0.2, 0, 1))
        cloud = blur_arr(np.clip((n - 0.4) * 2.5, 0, 1), 1.3)
        col = lerp_color(col, np.array([62, 84, 96], np.float32), cloud * 0.85)
        rim = np.clip((n2 - 0.6) * 5, 0, 1) * cloud
        col = lerp_color(col, np.array([186, 108, 58], np.float32), rim * 0.62)
        col = lerp_color(col, np.array([96, 110, 118], np.float32), np.clip((y - 0.6) / 0.35, 0, 1) * 0.28)
    col *= 1 + grain_tile(H, W, 3)[..., None] * 0.16
    return np.clip(col, 0, 255)


def hill_edge(kind: str) -> np.ndarray:
    x = np.linspace(0, 1, W, dtype=np.float32)
    if kind == "grove":
        y = np.full(W, 0.64, np.float32)
        domes = [(0.07, 0.06, 0.08), (0.2, 0.08, 0.15), (0.38, 0.055, 0.1), (0.53, 0.1, 0.17), (0.72, 0.075, 0.12), (0.89, 0.065, 0.11)]
        for cx, r, amp in domes:
            y -= amp * np.exp(-((x - cx) ** 2) / (2 * r * r))
        for cx, r, amp in [(0.2, 0.04, 0.03), (0.53, 0.05, 0.035)]:
            bump = np.exp(-((x - cx) ** 2) / (2 * r * r))
            y -= amp * np.clip(bump * 1.5 - 0.3, 0, 1)
    else:
        y = np.full(W, 0.74, np.float32)
        peaks = [
            (0.05, 0.018, 0.14),
            (0.13, 0.012, 0.3),
            (0.17, 0.01, 0.12),
            (0.3, 0.02, 0.2),
            (0.36, 0.01, 0.36),
            (0.48, 0.016, 0.15),
            (0.6, 0.02, 0.24),
            (0.67, 0.011, 0.4),
            (0.8, 0.018, 0.18),
            (0.9, 0.012, 0.28),
        ]
        for cx, r, amp in peaks:
            y -= amp * np.exp(-((x - cx) ** 2) / (2 * r * r))
    return np.clip(y, 0.16, 0.92) * H


def hills_plate(kind: str) -> np.ndarray:
    edge = hill_edge(kind)
    yy = np.arange(H, dtype=np.float32)[:, None]
    mask = np.clip((yy - edge[None, :]) / 5.0, 0, 1)
    field = fbm(H, W, 18 if kind == "grove" else 27, 5)
    depth = np.clip((yy - edge[None, :]) / 180.0, 0, 1)
    if kind == "grove":
        col = lerp_color(np.array([186, 204, 186], np.float32), np.array([54, 42, 86], np.float32), depth)
        col = lerp_color(col, np.array([24, 16, 40], np.float32), depth**1.4)
        col = lerp_color(col, np.array([210, 206, 176], np.float32), (field * np.clip(1 - depth * 1.6, 0, 1)) * 0.45)
    else:
        col = lerp_color(np.array([168, 120, 78], np.float32), np.array([28, 34, 40], np.float32), depth)
        col = lerp_color(col, np.array([12, 14, 18], np.float32), depth**1.3)
        col = lerp_color(col, np.array([90, 110, 118], np.float32), field * 0.22)
    col *= 1 + grain_tile(H, W, 6)[..., None] * 0.2
    foot = np.clip((yy - H * 0.8) / (H * 0.14), 0, 1)
    alpha = mask * (1 - foot) * 255
    return np.dstack([np.clip(col, 0, 255), alpha])


def stamp(rgba: np.ndarray, mask: np.ndarray, rgb: np.ndarray) -> None:
    a = mask[..., None]
    rgba[..., :3] = rgba[..., :3] * (1 - a) + rgb * a
    rgba[..., 3] = np.maximum(rgba[..., 3], mask * 255)


def blob(h: int, w: int, cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w]
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    return np.clip((1.02 - d) * min(rx, ry) * 0.22, 0, 1).astype(np.float32)


def draw_trees(kind: str) -> np.ndarray:
    rgba = np.zeros((H, W, 4), np.float32)
    field = fbm(H, W, 51 if kind == "grove" else 77, 4)
    rng = np.random.default_rng(8 if kind == "grove" else 9)
    count = 9 if kind == "grove" else 8
    for i in range(count):
        x = int(80 + i * (W - 160) / (count - 1) + rng.integers(-30, 30))
        lean = 0 if kind == "grove" else 50
        top = int(H * (0.30 + rng.random() * 0.08))
        bot = int(H * 0.78)
        width = 7 + int(rng.integers(0, 5))
        trunk = np.array([214, 206, 186] if kind == "grove" else [36, 42, 40], np.float32)
        for y in range(top + 24, bot):
            t = (y - top) / max(1, bot - top)
            cx = int(x + lean * t)
            half = max(2, int(width * (0.65 + 0.45 * t) / 2))
            x0, x1 = max(0, cx - half), min(W, cx + half + 1)
            if y >= H or x1 <= x0:
                continue
            span = np.linspace(-1, 1, x1 - x0, dtype=np.float32)
            shade = 0.7 + 0.3 * (1 - np.abs(span))
            col = trunk * shade[:, None]
            a = np.clip(1 - np.abs(span) * 0.15, 0, 1)
            under = rgba[y, x0:x1]
            aa = a[:, None]
            under[..., :3] = under[..., :3] * (1 - aa) + col * aa
            under[..., 3] = np.maximum(under[..., 3], a * 220)
        clusters = 6 if kind == "grove" else 3
        for k in range(clusters):
            ox = int(rng.integers(-36, 36) + (lean * 0.25 if kind == "storm" else 0))
            oy = int(rng.integers(-10, 36))
            rx = int(rng.integers(18, 48 if kind == "grove" else 28))
            ry = int(rng.integers(14, 34 if kind == "grove" else 16))
            mask = blob(H, W, x + ox + lean * 0.15, top + oy, rx, ry)
            if kind == "grove":
                base = np.array([22, 120, 108] if k % 2 == 0 else [92, 64, 140], np.float32)
                hi = np.array([150, 210, 180], np.float32)
            else:
                base = np.array([20, 64, 70] if k % 2 == 0 else [40, 48, 52], np.float32)
                hi = np.array([186, 116, 64], np.float32)
            local = field
            rgb = base + (hi - base) * (0.25 + 0.55 * local)[..., None]
            # underside darker
            yy = np.arange(H, dtype=np.float32)[:, None]
            rgb = rgb * (0.55 + 0.45 * np.clip((top + oy - yy) / max(ry, 1) + 0.35, 0, 1))[..., None]
            stamp(rgba, mask * (0.55 + 0.45 * local), rgb)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    rgba[..., 3] *= 1 - np.clip((yy - 0.7) / 0.12, 0, 1)
    rgba[..., :3] *= 1 + grain_tile(H, W, 12)[..., None] * 0.18
    return np.clip(rgba, 0, 255)


def ground_strip(kind: str, fill: bool) -> np.ndarray:
    h, w = 128, 2816
    n = fbm(h, w, 60 if kind == "grove" else 90, 5)
    n2 = fbm(h, w, 61 if kind == "grove" else 91, 3)
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    if kind == "grove":
        soil = lerp_color(np.array([32, 18, 44], np.float32), np.array([62, 40, 72], np.float32), n)
        soil = lerp_color(soil, np.array([110, 96, 120], np.float32), n2 * 0.25)
        if not fill:
            wave = 0.05 * np.sin(xx * math.pi * 14)
            cap = np.clip((0.34 + wave - yy) / 0.2, 0, 1)
            moss = lerp_color(np.array([70, 96, 78], np.float32), np.array([198, 208, 176], np.float32), n)
            col = lerp_color(soil, moss, cap)
        else:
            col = soil
    else:
        stone = lerp_color(np.array([22, 26, 30], np.float32), np.array([58, 66, 70], np.float32), n)
        stone = lerp_color(stone, np.array([150, 96, 58], np.float32), np.clip(n2 - 0.72, 0, 1) * 2.2)
        if not fill:
            wave = 0.035 * np.sin(xx * math.pi * 22)
            cap = np.clip((0.24 + wave - yy) / 0.14, 0, 1)
            moss = np.array([46, 92, 90], np.float32)
            col = lerp_color(stone, moss, cap * (0.45 + 0.55 * n))
            sheen = (0.5 + 0.5 * np.sin(yy * 40)) * np.clip(yy - 0.2, 0, 1)
            col = lerp_color(col, np.array([170, 190, 196], np.float32), sheen * 0.16)
        else:
            sheen = 0.5 + 0.5 * np.sin(yy * 34 + xx * 8)
            col = lerp_color(stone, np.array([80, 90, 96], np.float32), sheen * 0.15)
    col *= 1 + grain_tile(h, w, 2)[..., None] * 0.22
    return np.clip(col, 0, 255)


def ellipse(h: int, w: int, cx: float, cy: float, rx: float, ry: float, rot: float = 0.0) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w]
    x = xx - cx
    y = yy - cy
    if rot:
        c, s = math.cos(rot), math.sin(rot)
        x, y = c * x + s * y, -s * x + c * y
    dist = np.sqrt((x / max(rx, 0.8)) ** 2 + (y / max(ry, 0.8)) ** 2)
    return np.clip(1.15 - dist, 0, 1).astype(np.float32)


def shade_volume(mask: np.ndarray, base: tuple[int, int, int], shadow: tuple[int, int, int], hi: tuple[int, int, int], tex: np.ndarray) -> np.ndarray:
    soft = blur_arr(mask, 1.4)
    gy, gx = np.gradient(blur_arr(mask, 3.2))
    light = np.clip(0.35 - 2.2 * gx - 2.8 * gy, 0, 1)
    light = blur_arr(light * soft + (1 - soft) * 0.2, 0.8)
    col = lerp_color(np.array(shadow, np.float32), np.array(hi, np.float32), light)
    col = lerp_color(col, np.array(base, np.float32), 0.28)
    col *= 0.78 + 0.4 * tex[..., None]
    rgb = np.zeros(mask.shape + (3,), np.float32)
    a = mask[..., None]
    rgb = col * a
    return np.dstack([rgb, mask * 255])


def over(dst: np.ndarray, src: np.ndarray) -> None:
    a = (src[..., 3:4] / 255.0) * (src[..., 3:4] > 4)
    dst[..., :3] = dst[..., :3] * (1 - a) + src[..., :3] * a
    dst[..., 3] = np.maximum(dst[..., 3], src[..., 3])


def finish(rgba: np.ndarray, seed: int) -> np.ndarray:
    alpha = rgba[..., 3] / 255.0
    soft = blur_arr(np.clip(alpha, 0, 1), 1.3)
    rim = np.clip(soft - alpha, 0, 1)
    ink = np.array([28, 20, 16], np.float32)
    rgba[..., :3] = rgba[..., :3] * (1 - rim[..., None] * 0.9) + ink * rim[..., None] * 0.9
    rgba[..., 3] = np.maximum(rgba[..., 3], rim * 210)
    rgba[..., :3] *= 1 + grain_tile(rgba.shape[0], rgba.shape[1], seed)[..., None] * 0.22
    return np.clip(rgba, 0, 255)


def tex_field(h: int, w: int, seed: int) -> np.ndarray:
    n = fbm(h, w, seed, 4)
    src = np.asarray(Image.open(GAME / "nub-0.png").convert("L")).astype(np.float32) / 255.0
    src = np.asarray(Image.fromarray((src * 255).astype(np.uint8), "L").resize((w, h), Image.Resampling.BILINEAR)).astype(np.float32) / 255.0
    return np.clip(0.55 * n + 0.45 * src, 0, 1)


def beast_grove(frame: int) -> np.ndarray:
    w, h = 380, 280
    step = frame % 4
    bob = [0, -3, 0, -2][step]
    swing = [0, 7, 0, -7][step]
    front = [0, -14, 2, 12][step]
    back = [10, -2, -12, 4][step]
    tex = tex_field(h, w, 3 + frame)
    body = ellipse(h, w, 188, 168 + bob, 92, 48)
    body = np.maximum(body, ellipse(h, w, 268, 156 + bob, 48, 36))
    body = np.maximum(body, ellipse(h, w, 312, 164 + bob, 28, 18))
    belly = ellipse(h, w, 196, 184 + bob, 60, 24)
    legs = ellipse(h, w, 132, 214 + bob + back, 16, 36)
    legs = np.maximum(legs, ellipse(h, w, 188, 218 + bob + swing, 15, 34))
    legs = np.maximum(legs, ellipse(h, w, 236, 214 + bob - swing, 15, 36))
    legs = np.maximum(legs, ellipse(h, w, 286, 206 + bob + front, 14, 32))
    mane = np.zeros((h, w), np.float32)
    for i, ox in enumerate((-48, -18, 12, 40, 68)):
        mane = np.maximum(mane, ellipse(h, w, 168 + ox, 122 + bob + (i % 2) * 6, 16, 22, rot=-0.7 + i * 0.18))
    tusk = ellipse(h, w, 332, 158 + bob, 8, 16, rot=-0.6)
    tusk = np.maximum(tusk, ellipse(h, w, 324, 176 + bob, 6, 12, rot=0.5))
    eye_w = ellipse(h, w, 292, 150 + bob, 8, 8)
    eye = ellipse(h, w, 294, 150 + bob, 3.4, 3.4)
    rgba = np.zeros((h, w, 4), np.float32)
    over(rgba, shade_volume(np.clip(legs, 0, 1), (62, 40, 30), (28, 16, 14), (120, 86, 60), tex))
    over(rgba, shade_volume(np.clip(body, 0, 1), (112, 68, 40), (48, 26, 18), (176, 124, 78), tex))
    over(rgba, shade_volume(belly * body, (236, 214, 176), (186, 150, 112), (255, 244, 220), tex * 0.5 + 0.4))
    over(rgba, shade_volume(mane, (26, 128, 112), (12, 54, 58), (150, 210, 176), tex))
    over(rgba, shade_volume(tusk, (226, 92, 52), (140, 48, 28), (255, 186, 130), tex))
    over(rgba, shade_volume(eye_w, (255, 236, 206), (220, 190, 150), (255, 250, 240), tex * 0.2 + 0.6))
    over(rgba, shade_volume(eye, (32, 18, 14), (10, 8, 8), (60, 30, 20), tex * 0.2 + 0.5))
    return finish(rgba, frame + 2)


def beast_crown(frame: int) -> np.ndarray:
    w, h = 420, 360
    step = frame % 4
    bob = [0, -4, 1, -2][step]
    front = [0, -16, 4, 14][step]
    back = [12, 0, -14, 3][step]
    tex = tex_field(h, w, 20 + frame)
    body = ellipse(h, w, 200, 230 + bob, 96, 50)
    neck = ellipse(h, w, 292, 188 + bob, 28, 48, rot=-0.4)
    head = ellipse(h, w, 332, 156 + bob, 36, 28)
    snout = ellipse(h, w, 368, 168 + bob, 18, 12)
    body = np.maximum(np.maximum(body, neck), np.maximum(head, snout))
    belly = ellipse(h, w, 190, 248 + bob, 58, 22)
    legs = ellipse(h, w, 140, 292 + bob + back, 14, 46)
    legs = np.maximum(legs, ellipse(h, w, 196, 298 + bob, 13, 44))
    legs = np.maximum(legs, ellipse(h, w, 250, 286 + bob + front, 13, 48))
    legs = np.maximum(legs, ellipse(h, w, 304, 276 + bob + front * 0.3, 12, 40))
    horns = np.zeros((h, w), np.float32)
    for k, sign in enumerate((-1, 1)):
        for t in np.linspace(0, 1, 16):
            cx = 318 + sign * (8 + t * 36)
            cy = 132 + bob - t * 48 + sign * 6
            horns = np.maximum(horns, ellipse(h, w, cx, cy, 7 - t * 2, 10, rot=sign * (0.4 + t)))
            if t > 0.45:
                horns = np.maximum(horns, ellipse(h, w, cx + sign * 14, cy + 6, 8, 4, rot=sign * 0.9))
    scar = ellipse(h, w, 230, 214 + bob, 26, 4, rot=0.45)
    eye_w = ellipse(h, w, 346, 150 + bob, 7, 7)
    eye = ellipse(h, w, 348, 150 + bob, 3, 3)
    rgba = np.zeros((h, w, 4), np.float32)
    over(rgba, shade_volume(np.clip(legs, 0, 1), (36, 46, 58), (14, 18, 26), (90, 110, 124), tex))
    over(rgba, shade_volume(np.clip(body, 0, 1), (64, 88, 112), (20, 30, 42), (150, 176, 190), tex))
    over(rgba, shade_volume(belly * np.clip(body + 0.2, 0, 1), (232, 214, 190), (180, 156, 130), (255, 246, 230), tex * 0.4 + 0.45))
    over(rgba, shade_volume(scar, (196, 92, 48), (120, 48, 28), (255, 170, 96), tex))
    over(rgba, shade_volume(horns, (214, 162, 58), (120, 78, 24), (255, 226, 140), tex))
    over(rgba, shade_volume(eye_w, (250, 236, 210), (200, 180, 150), (255, 250, 240), tex * 0.2 + 0.6))
    over(rgba, shade_volume(eye, (24, 16, 14), (8, 6, 6), (50, 24, 16), tex * 0.2 + 0.5))
    return finish(rgba, 30 + frame)


def giant_sprite(frame: int) -> np.ndarray:
    w, h = 300, 440
    step = frame % 4
    sway = [-8, 0, 8, 0][step]
    arm = [0, -10, 6, 10][step]
    tex = tex_field(h, w, 40 + frame)
    coat = np.zeros((h, w), np.float32)
    # tapered coat via stacked ellipses blended — then a polygon core
    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)
    cx = 148 + sway
    draw.polygon(
        [(cx - 36, 150), (cx + 40, 156), (cx + 52, 330), (cx + 18, 348), (cx - 48, 330)],
        fill=255,
    )
    coat = np.asarray(img).astype(np.float32) / 255.0
    coat = np.maximum(coat, ellipse(h, w, cx, 168, 34, 28))
    legs = ellipse(h, w, cx - 16, 372, 14, 48)
    legs = np.maximum(legs, ellipse(h, w, cx + 18, 376, 14, 46))
    arm_m = ellipse(h, w, cx + 54, 230 + arm, 12, 58, rot=0.4)
    ember = ellipse(h, w, cx + 78, 176 + arm, 11, 11)
    head = ellipse(h, w, cx + 4, 112, 30, 32)
    eye_w = ellipse(h, w, cx + 12, 112, 9, 9)
    eye = ellipse(h, w, cx + 14, 112, 4, 4)
    rgba = np.zeros((h, w, 4), np.float32)
    over(rgba, shade_volume(legs, (32, 22, 20), (12, 8, 8), (70, 48, 40), tex))
    over(rgba, shade_volume(coat, (64, 36, 32), (24, 12, 14), (120, 72, 56), tex))
    over(rgba, shade_volume(arm_m, (48, 30, 26), (16, 10, 10), (96, 60, 48), tex))
    over(rgba, shade_volume(ember, (228, 110, 42), (140, 48, 20), (255, 210, 120), tex))
    over(rgba, shade_volume(head, (230, 168, 64), (120, 72, 24), (255, 226, 150), tex))
    over(rgba, shade_volume(eye_w, (255, 236, 190), (220, 180, 120), (255, 250, 230), tex * 0.2 + 0.7))
    over(rgba, shade_volume(eye, (40, 18, 12), (10, 6, 6), (80, 30, 16), tex * 0.2 + 0.5))
    return finish(rgba, 50 + frame)


def main() -> None:
    save_rgb(GAME / "grove-sky.png", sky_plate("grove"))
    save_rgb(GAME / "storm-sky.png", sky_plate("storm"))
    save_rgba(GAME / "grove-hills.png", hills_plate("grove"))
    save_rgba(GAME / "storm-hills.png", hills_plate("storm"))
    save_rgba(GAME / "grove-trees.png", draw_trees("grove"))
    save_rgba(GAME / "storm-trees.png", draw_trees("storm"))
    save_rgb(GAME / "grove-ground-top.png", ground_strip("grove", False))
    save_rgb(GAME / "grove-ground-fill.png", ground_strip("grove", True))
    save_rgb(GAME / "storm-ground-top.png", ground_strip("storm", False))
    save_rgb(GAME / "storm-ground-fill.png", ground_strip("storm", True))
    for i in range(4):
        save_rgba(GAME / f"beast-grove-{i}.png", beast_grove(i))
        save_rgba(GAME / f"beast-crown-{i}.png", beast_crown(i))
        save_rgba(GAME / f"giant-{i}.png", giant_sprite(i))
    # contact preview
    sky = Image.open(GAME / "grove-sky.png").convert("RGBA")
    hills = Image.open(GAME / "grove-hills.png").convert("RGBA")
    trees = Image.open(GAME / "grove-trees.png").convert("RGBA")
    grove = Image.alpha_composite(sky, hills)
    grove = Image.alpha_composite(grove, trees)
    grove.resize((840, 360), Image.Resampling.LANCZOS).save("/workspace/screenshots/grove-plate.png")
    sky = Image.open(GAME / "storm-sky.png").convert("RGBA")
    hills = Image.open(GAME / "storm-hills.png").convert("RGBA")
    trees = Image.open(GAME / "storm-trees.png").convert("RGBA")
    storm = Image.alpha_composite(Image.alpha_composite(sky, hills), trees)
    storm.resize((840, 360), Image.Resampling.LANCZOS).save("/workspace/screenshots/storm-plate.png")
    print("baked")


if __name__ == "__main__":
    main()
