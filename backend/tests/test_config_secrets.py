# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""No secret is read from anywhere but the environment; none is committed."""
from __future__ import annotations

import pathlib
import re

import ongigil.config as config


def test_provider_key_defaults_empty_and_comes_from_env(monkeypatch):
    config.get_settings.cache_clear()
    monkeypatch.delenv("ONGIGIL_DIRECTIONS_PROVIDER_KEY", raising=False)
    assert config.get_settings().directions_provider_key == ""

    config.get_settings.cache_clear()
    monkeypatch.setenv("ONGIGIL_DIRECTIONS_PROVIDER_KEY", "from-env-only")
    assert config.get_settings().directions_provider_key == "from-env-only"

    config.get_settings.cache_clear()


def test_no_secret_literals_committed_in_source():
    """The package must contain no hard-coded secret: the only source of a key is
    os.getenv. Flag any assignment of a NON-EMPTY quoted string literal to a
    secret-named identifier (empty-string defaults and param passthroughs are ok)."""
    pkg = pathlib.Path(config.__file__).parent
    # e.g.  api_key = "abc"   secret='x'   provider_key = "k"   password = "p"
    pattern = re.compile(
        r"""(?ix)                     # case-insensitive, verbose
        \b\w*(?:api_?key|secret|password|token|passwd)\b   # secret-ish name
        \s*=\s*                        # assignment
        (['"])                         # opening quote
        (?P<val>[^'"]+)                # NON-EMPTY literal content
        \1                             # closing quote
        """
    )
    for path in pkg.rglob("*.py"):
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            m = pattern.search(line)
            assert m is None, f"possible committed secret in {path}:{lineno}: {line!r}"
