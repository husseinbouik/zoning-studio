import * as THREE from 'three';
import type { Finish } from './design';

/**
 * Procedural wood texture, drawn on a canvas at runtime — base colour with
 * soft horizontal grain streaks and a few darker knots of grain. No image
 * assets are used anywhere in this project.
 */
export function makeWoodTexture(finish: Finish): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = finish.base;
  ctx.fillRect(0, 0, size, size);

  // Deterministic pseudo-random so every panel of a finish looks consistent.
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Long horizontal grain streaks.
  for (let i = 0; i < 90; i++) {
    const y = rand() * size;
    const h = 1 + rand() * 3;
    const alpha = 0.04 + rand() * 0.1;
    ctx.fillStyle = hexWithAlpha(finish.grain, alpha);
    ctx.fillRect(0, y, size, h);
  }
  // A few wavy darker grain lines.
  ctx.strokeStyle = hexWithAlpha(finish.grain, 0.18);
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = 0.8 + rand() * 1.4;
    ctx.beginPath();
    const y0 = rand() * size;
    ctx.moveTo(0, y0);
    for (let x = 0; x <= size; x += 32) {
      ctx.lineTo(x, y0 + Math.sin(x / 60 + i) * 3 + (rand() - 0.5) * 2);
    }
    ctx.stroke();
  }
  // Subtle light sheen bands.
  for (let i = 0; i < 24; i++) {
    const y = rand() * size;
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.04})`;
    ctx.fillRect(0, y, size, 2 + rand() * 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
