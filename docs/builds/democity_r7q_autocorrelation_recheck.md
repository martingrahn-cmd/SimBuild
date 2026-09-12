# Democity r7q aerial autocorrelation recheck — 2026-09-09

The retained rank-5 blocker still cited the r3 noon result 0.5667 against the 0.55 ceiling. r7q makes no production change. It adds a deterministic implementation of the established full-resolution 101 px moving-mean detrending and lag-24..400 Pearson test, then measures fresh r7p images.

| Frame | Columns max | Lag | Rows max | Lag | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| aerial 12:00 | 0.538390 | 40 | 0.392787 | 31 | pass |
| aerial 17:30 | 0.248725 | 36 | 0.485932 | 29 | pass |
| overview 12:00 | 0.261579 | 33 | 0.314776 | 29 | pass |

Exact repeated analysis of the same image is byte-identical. All three captures are ready with zero errors and were visually inspected. Evidence is under `shots/democity/r7q-autocorrelation/`; the tool is `tools/democity-autocorrelation.py`.

The old 0.5667 result is superseded for the current source. This closes only the numeric autocorrelation clause; it does not claim that asset variety, district grain or city scale now meet their separate standards, and it does not change the 6.0 score.
