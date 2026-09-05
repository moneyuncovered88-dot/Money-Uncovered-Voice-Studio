"""Script preprocessing pipeline (pure, deterministic, dependency-free).

Order (see docs/ARCHITECTURE.md):
    raw -> normalize whitespace -> normalize punctuation -> strip stage
    directions -> handle headings -> apply pronunciation dictionary ->
    detect paragraphs/sentences -> smart chunking.

Everything here is pure Python so it is fast and fully unit-testable without
a GPU, network, or database.
"""
