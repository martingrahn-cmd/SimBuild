#!/usr/bin/env python3
"""Deterministic Democity golden-hour image metrics from the critic convention."""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def components(mask):
    seen = np.zeros(mask.shape, dtype=bool)
    height, width = mask.shape
    for start_y, start_x in zip(*np.where(mask)):
        if seen[start_y, start_x]:
            continue
        seen[start_y, start_x] = True
        queue = [(start_y, start_x)]
        component = []
        while queue:
            y, x = queue.pop()
            component.append((y, x))
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                next_y, next_x = y + dy, x + dx
                if (0 <= next_y < height and 0 <= next_x < width
                        and mask[next_y, next_x] and not seen[next_y, next_x]):
                    seen[next_y, next_x] = True
                    queue.append((next_y, next_x))
        yield component


def measure(path):
    image = Image.open(path).convert("RGB")
    height = round(image.height * 480 / image.width)
    rgb = np.asarray(image.resize((480, height), Image.Resampling.LANCZOS))
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722])
    windows = np.array([
        [luminance[y:y + 24, x:x + 24].std() < 6
         for x in range(0, luminance.shape[1] - 23, 12)]
        for y in range(0, luminance.shape[0] - 23, 12)
    ])
    largest_pct = 0.0
    largest_bbox = None
    for component in components(windows):
        area = np.zeros(luminance.shape, dtype=bool)
        for y, x in component:
            area[y * 12:y * 12 + 24, x * 12:x * 12 + 24] = True
        pct = float(area.mean() * 100)
        if pct > largest_pct:
            ys, xs = np.where(area)
            largest_pct = pct
            largest_bbox = {
                "x": int(xs.min()), "y": int(ys.min()),
                "width": int(xs.max() - xs.min() + 1),
                "height": int(ys.max() - ys.min() + 1),
            }
    p50, p99 = np.percentile(luminance, [50, 99])
    return {
        "file": str(path),
        "mean": float(luminance.mean()),
        "std": float(luminance.std()),
        "p50": float(p50),
        "p99": float(p99),
        "p99p50": float(p99 / max(p50, 0.0001)),
        "above180Pct": float((luminance > 180).mean() * 100),
        "above235Pct": float((luminance > 235).mean() * 100),
        "largestFlatPatchPct": largest_pct,
        "largestFlatPatchBbox480": largest_bbox,
    }


if len(sys.argv) < 2:
    raise SystemExit("usage: democity-golden-stats.py <png> [...]")

print(json.dumps([measure(Path(argument)) for argument in sys.argv[1:]], indent=2))
