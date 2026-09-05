"""Audio assembly package.

Phase 6 implements FFmpeg-based validation, silence trimming, pause insertion,
concatenation, loudness normalization, and MP3/WAV encoding. This package
currently ships the pure timeline math (chunk start/end positions) that powers
final-audio metadata and future subtitle / scene-timestamp generation.
"""
