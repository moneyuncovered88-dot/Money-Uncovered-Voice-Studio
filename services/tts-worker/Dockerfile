# MU Voice Studio — Chatterbox-Turbo RunPod worker
#
# IMPORTANT (verify during RunPod setup, do not assume):
#   * Confirm this base image tag exists and matches the CUDA version your
#     RunPod GPU offers. A PyTorch CUDA runtime image is a good starting point.
#   * `chatterbox-tts` depends on specific torch/torchaudio builds. If pip tries
#     to reinstall a conflicting torch, either pin torch here to match the base
#     image, or start from a plain CUDA image and let pip install torch.
#
# Model weights (ResembleAI/chatterbox-turbo) download from Hugging Face on the
# first run. For faster cold starts, mount a RunPod network volume and set
# HF_HOME to it, or bake the weights into the image. See docs/RUNPOD_SETUP.md.

FROM pytorch/pytorch:2.5.1-cuda12.1-cudnn9-runtime

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/runpod-volume/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-u", "worker.py"]
