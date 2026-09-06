"""Process-local sliding-window rate limiter.

Good enough for a single backend instance (our current Railway deploy). If the
API is ever scaled horizontally, swap the in-memory store for Redis behind the
same `check()` signature.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from app.errors import RateLimitError

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def check(key: str, limit: int, window_seconds: float = 60.0) -> None:
    """Allow at most `limit` events per `window_seconds` for `key`.

    Raises RateLimitError when the limit is exceeded.
    """
    if limit <= 0:
        return
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        dq = _hits[key]
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= limit:
            retry = max(1, int(dq[0] + window_seconds - now))
            raise RateLimitError(f"Too many requests. Please wait {retry}s and try again.")
        dq.append(now)
