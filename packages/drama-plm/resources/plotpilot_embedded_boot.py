"""Drama embedded boot module for PlotPilot.

PlotPilot v4.6 performs Windows orphan-process cleanup during FastAPI startup.
When launched via ``python -m uvicorn`` from Drama, that cleanup can mistake the
fresh uvicorn parent process for an orphan and kill the sidecar. Drama owns the
sidecar lifecycle, so embedded startup disables that cleanup before FastAPI's
lifespan runs.
"""

from __future__ import annotations

import os


os.environ.setdefault("PLOTPILOT_EMBEDDED_RUNTIME", "1")
os.environ.setdefault("PLOTPILOT_SKIP_ORPHAN_CLEANUP", "1")
os.environ.setdefault("PLOTPILOT_SKIP_PROCESS_CLEANUP", "1")

import interfaces.main as _plotpilot_main  # noqa: E402


def _skip_orphan_cleanup() -> None:
    return None


_plotpilot_main._cleanup_orphan_python_processes = _skip_orphan_cleanup

_lifecycle = getattr(_plotpilot_main, "_lifecycle", None)
if _lifecycle is not None and hasattr(_lifecycle, "_cleanup_orphans"):
    _lifecycle._cleanup_orphans = _skip_orphan_cleanup

app = _plotpilot_main.app
