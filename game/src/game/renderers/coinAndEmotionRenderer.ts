let cachedGreenbitsLogoImg: HTMLImageElement | null = null;
let greenbitsLogoLoading = false;

export function getGreenbitsCoinImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!cachedGreenbitsLogoImg && !greenbitsLogoLoading) {
    greenbitsLogoLoading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      cachedGreenbitsLogoImg = img;
    };
    img.src = '/assets/aistudio/image_3961e3ca.png';
  }
  return cachedGreenbitsLogoImg;
}

/**
 * Renders the exact official Greenbit logo (`/assets/aistudio/image_3961e3ca.png`):
 * - Uses the loaded `/assets/aistudio/image_3961e3ca.png` asset directly when ready.
 * - Falls back while loading to a 1:1 vector rendition of the official Greenbit logo
 *   (tilted 3D chartreuse-lime coin with dark forest-green border `#043e21`, 3D green side wall,
 *   top-left white pill highlight, twin white sprout leaves with dark green outline, and 3 green sparkle pills at top-right).
 */
export function drawVectorGreenbitsCoin(ctx: CanvasRenderingContext2D, radius = 16): void {
  ctx.save();

  const logoImg = getGreenbitsCoinImage();
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const size = radius * 2.35;
    ctx.drawImage(logoImg, -size * 0.5, -size * 0.5, size, size);
    ctx.restore();
    return;
  }

  const s = radius / 16;
  ctx.scale(s, s);

  // 1. 3D Coin Outer Dark Forest-Green Border & Left-Bottom Extruded Edge
  ctx.fillStyle = '#15803d';
  ctx.strokeStyle = '#043e21';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(-1.2, 1.0, 14.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Diagonal 3D edge shading stripes on lower-left rim
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-13.2, -3.5);
  ctx.lineTo(-9.5, -6.5);
  ctx.moveTo(-13.8, 1.5);
  ctx.lineTo(-9.8, -1.5);
  ctx.moveTo(-12.2, 6.2);
  ctx.lineTo(-8.2, 3.2);
  ctx.stroke();

  // 2. Front Tilted Chartreuse-Lime Coin Face
  const rimGrad = ctx.createLinearGradient(-11, -12, 12, 12);
  rimGrad.addColorStop(0, '#fef08a');
  rimGrad.addColorStop(0.35, '#d9f938');
  rimGrad.addColorStop(1, '#84cc16');
  ctx.fillStyle = rimGrad;
  ctx.strokeStyle = '#043e21';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0.6, -0.4, 12.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Recessed Inner Lime Dish
  const dishGrad = ctx.createRadialGradient(-2, -4, 1, 0.8, 0, 10.2);
  dishGrad.addColorStop(0, '#ecfccb');
  dishGrad.addColorStop(0.35, '#bef264');
  dishGrad.addColorStop(1, '#65a30d');
  ctx.fillStyle = dishGrad;
  ctx.strokeStyle = '#4d7c0f';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0.8, -0.3, 9.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Top-Left White Specular Pill Highlight
  ctx.save();
  ctx.translate(-4.6, -5.2);
  ctx.rotate(-0.68);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(-1.3, -3.2, 2.6, 6.4, 1.3);
  ctx.fill();
  ctx.restore();

  // 5. Twin White Sprout Leaves with Thick Dark-Green (`#043e21`) Outline & Open Stem Base
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#043e21';
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Left stem base up to left leaf
  ctx.moveTo(0.8, 7.6);
  ctx.lineTo(-0.2, 4.8);
  ctx.bezierCurveTo(-4.8, 5.2, -7.2, 2.2, -7.2, -1.0);
  ctx.bezierCurveTo(-3.4, -1.8, -0.2, -0.2, 1.0, 2.5);
  // Right larger leaf
  ctx.bezierCurveTo(1.2, -1.8, 4.2, -4.6, 7.8, -4.4);
  ctx.bezierCurveTo(9.2, -0.5, 7.2, 3.6, 2.8, 4.4);
  ctx.lineTo(3.6, 7.2);
  ctx.fill();
  ctx.stroke();

  // 6. Three Floating Green Sparkle Pills at Top-Right
  const sparkles = [
    { x: 9.8, y: -13.6, rot: 0.32, w: 2.4, h: 5.4 },
    { x: 13.6, y: -10.4, rot: 0.78, w: 2.4, h: 5.4 },
    { x: 15.4, y: -5.8, rot: 1.28, w: 2.2, h: 4.8 },
  ];
  for (const sp of sparkles) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.rot);
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#043e21';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-sp.w * 0.5, -sp.h * 0.5, sp.w, sp.h, sp.w * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders an unmistakable, floating comic overhead emotion badge above an animal in sanctuary.
 */
export function drawOverheadEmotionBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  emotion: string,
  alpha: number,
  elapsedSec: number,
): void {
  if (alpha <= 0.01 || emotion === 'normal' || emotion === 'idle') return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);

  const bob = Math.sin(elapsedSec * 2.2) * 1.5;
  ctx.translate(0, bob);

  const r = 18;
  // Speech bubble pointer tail pointing down (clean closed comic bubble)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#002c17';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Seamless counter-clockwise arc across top of bubble from bottom-right to bottom-left
  ctx.arc(0, -3, r, 0.22 * Math.PI, 0.78 * Math.PI, true);
  // Symmetrical downward comic pointer tail
  ctx.lineTo(0, r + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vector icon based on emotion (aligned directly to the center of the bubble sphere)
  ctx.save();
  ctx.translate(0, -3);

  if (emotion === 'laugh') {
    // Laughing hearts / sparkles
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -2, -7, -7, 0, -3);
    ctx.bezierCurveTo(7, -7, 8, -2, 0, 4);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'waving') {
    // Golden radio/broadcast wave signal (concentric upward radiating arcs + solid base dot, perfectly centered)
    const dotY = 4.2;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';

    // 3 concentric wave arcs radiating upwards symmetrically
    const radii = [6.2, 10.2, 14.2];
    for (const rad of radii) {
      ctx.beginPath();
      ctx.arc(0, dotY, rad, -Math.PI * 0.74, -Math.PI * 0.26);
      ctx.stroke();
    }
  } else if (emotion === 'wondered') {
    // Bright cyan question mark
    ctx.fillStyle = '#0284c7';
    ctx.font = '800 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 0);
  } else if (emotion === 'angry') {
    // Red 💢 anger cross mark
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(0, -2, 6, -6);
    ctx.moveTo(-6, 6);
    ctx.quadraticCurveTo(0, 2, 6, 6);
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(-2, 0, -6, 6);
    ctx.moveTo(6, -6);
    ctx.quadraticCurveTo(2, 0, 6, 6);
    ctx.stroke();
  } else if (emotion === 'crying') {
    // Blue teardrop
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(6, 0, 0, 6);
    ctx.quadraticCurveTo(-6, 0, 0, -7);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'sleepy') {
    // Purple Zzz
    ctx.fillStyle = '#7c3aed';
    ctx.font = '800 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Zzz', 0, 0);
  } else if (emotion === 'blush') {
    // Pink twin hearts
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-3, 3);
    ctx.bezierCurveTo(-7, 0, -6, -4, -3, -1);
    ctx.bezierCurveTo(0, -4, 1, 0, -3, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, -1);
    ctx.bezierCurveTo(0, -4, 1, -7, 3, -5);
    ctx.bezierCurveTo(6, -7, 7, -4, 3, -1);
    ctx.fill();
  } else if (emotion === 'congratulate') {
    // Golden star
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let s = 0; s < 5; s++) {
      const a1 = (s * Math.PI * 2) / 5 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      if (s === 0) ctx.moveTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
      else ctx.lineTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
      ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}


export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

