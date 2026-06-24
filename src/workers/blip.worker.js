/**
 * BLIP Image Captioning Worker
 * ────────────────────────────
 * Runs entirely in the browser via Transformers.js (WebAssembly).
 * The image is processed here; NOTHING is sent to any external server.
 *
 * Privacy guarantee: pixel data stays on device at all times.
 */

import { pipeline, env } from '@huggingface/transformers';

// Keep model weights in IndexedDB so they only download once
env.allowLocalModels = false;
env.useBrowserCache  = true;

let captioner = null;

self.onmessage = async (event) => {
  const { type, imageDataUrl, mimeType } = event.data;

  if (type !== 'CAPTION') return;

  try {
    // Report loading progress
    if (!captioner) {
      self.postMessage({ type: 'STATUS', message: 'Downloading BLIP model (one-time, ~200 MB)…' });

      captioner = await pipeline(
        'image-to-text',
        'Xenova/blip-image-captioning-base',
        {
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              const pct = Math.round((progress.loaded / progress.total) * 100);
              self.postMessage({ type: 'PROGRESS', percent: pct, file: progress.file });
            }
          }
        }
      );

      self.postMessage({ type: 'STATUS', message: 'Model loaded — analysing image…' });
    }

    // Run inference
    const result = await captioner(imageDataUrl, {
      max_new_tokens: 100,
      num_beams: 4,
      early_stopping: true
    });

    const description = result?.[0]?.generated_text || '';
    self.postMessage({ type: 'DONE', description });

  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message });
  }
};
