#!/usr/bin/env python3
"""Measure Democity's full-resolution aerial repetition convention deterministically."""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def axis_result(signal):
    trend = np.convolve(
        np.pad(signal, (50, 50), mode="edge"), np.ones(101) / 101, mode="valid"
    )
    residual = signal - trend
    values = []
    for lag in range(24, min(401, len(residual) - 1)):
        correlation = float(np.corrcoef(residual[:-lag], residual[lag:])[0, 1])
        values.append((abs(correlation), correlation, lag))
    absolute, signed, lag = max(values)
    return {"maxAbs": absolute, "signed": signed, "lagPx": lag, "pass": absolute <= 0.55}


def measure(path):
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=float)
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722])
    columns = axis_result(luminance.mean(axis=0))
    rows = axis_result(luminance.mean(axis=1))
    return {"file": str(path), "columns": columns, "rows": rows,
            "pass": columns["pass"] and rows["pass"]}


if len(sys.argv) < 2:
    raise SystemExit("usage: democity-autocorrelation.py <png> [...]")
print(json.dumps([measure(Path(argument)) for argument in sys.argv[1:]], indent=2))
