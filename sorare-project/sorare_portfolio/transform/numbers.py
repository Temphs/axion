"""One safe way to turn a column into numbers.

`Series.astype(float)` raises on pandas' NA rather than passing it through, so
any column that can legitimately be empty - a position with no paid cards, a
player with no completed sales, a thesis with no target price - crashes the
whole export the first time a real portfolio contains one. Every division and
percentage in this package goes through `numeric` instead, which turns what
cannot be a number into a blank and leaves the rest alone.
"""

from __future__ import annotations

import pandas as pd


def numeric(values) -> pd.Series:
    return pd.to_numeric(values, errors="coerce")
