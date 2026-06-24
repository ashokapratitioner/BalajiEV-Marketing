import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Eye, Edit3, Image as ImageIcon, MapPin } from 'lucide-react';
import { stitchMapToCanvas } from './MapCustomizer';

const TEMPLATES = [
  { id: 'glass', name: 'Glassmorphic Float', desc: 'Glass card floating over full image' },
  { id: 'stamp', name: 'Traveler Stamp', desc: 'Minimalist polaroid look with a circular stamp map' },
  { id: 'grid', name: 'Urban Grid', desc: 'Split layout with image on top, full map on bottom' },
  { id: 'luxury', name: 'Lux Minimalist', desc: 'Framed image with gold borders and map insert' },
];

export default function PostPreview({
  image,
  blurZones,
  location,
  onPublishPrepared,
  template,
  setTemplate,
  headline,
  setHeadline,
  subHeadline,
  setSubHeadline,
  brandingText,
  setBrandingText
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const canvasRef = useRef(null);

  const formatCoords = (lat, lng) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  // Main canvas rendering function
  const renderCanvas = async () => {
    if (!image) return;
    setIsGenerating(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1080;

    // Load base image and logo simultaneously
    const [baseImg, logoImg] = await Promise.all([
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = image.url;
      }),
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // Fallback if logo fails
        img.src = '/balaji_logo_b.jpg';
      })
    ]);

    // Create an offscreen canvas to render the base image with blurs applied
    const blurredCanvas = document.createElement('canvas');
    blurredCanvas.width = baseImg.naturalWidth;
    blurredCanvas.height = baseImg.naturalHeight;
    const bCtx = blurredCanvas.getContext('2d');

    // Draw base image
    bCtx.drawImage(baseImg, 0, 0);

    // Apply blur zones
    blurZones.forEach((zone) => {
      const cx = (zone.x / 100) * blurredCanvas.width;
      const cy = (zone.y / 100) * blurredCanvas.height;
      const r = (zone.r / 100) * Math.min(blurredCanvas.width, blurredCanvas.height);

      bCtx.save();
      bCtx.beginPath();
      bCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bCtx.clip();

      if (zone.type === 'pixelate') {
        const size = Math.max(8, Math.round(r / 6));
        const sWidth = r * 2;
        const sHeight = r * 2;
        const sx = cx - r;
        const sy = cy - r;

        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const oCtx = offscreen.getContext('2d');
        oCtx.drawImage(blurredCanvas, sx, sy, sWidth, sHeight, 0, 0, size, size);

        bCtx.imageSmoothingEnabled = false;
        bCtx.drawImage(offscreen, 0, 0, size, size, sx, sy, sWidth, sHeight);
      } else {
        bCtx.filter = 'blur(20px)';
        bCtx.drawImage(baseImg, 0, 0);
      }
      bCtx.restore();
    });

    // NOW DRAW ACCORDING TO THE SELECTED TEMPLATE
    ctx.clearRect(0, 0, 1080, 1080);

    if (template === 'glass') {
      // --- GLASSMORPHIC FLOAT ---
      ctx.drawImage(blurredCanvas, 0, 0, 1080, 1080);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, 1080, 1080);

      const pX = 60, pY = 60, pW = 960, pH = 960;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pX, pY, pW, pH, 32);
      ctx.clip();
      ctx.drawImage(blurredCanvas, pX - 50, pY - 50, pW + 100, pH + 100);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pX, pY, pW, pH, 32);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();

      // Frosted Glass Footer
      const fH = 260;
      const fY = pY + pH - fH;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pX, pY, pW, pH, 32);
      ctx.clip();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(pX, fY, pW, fH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(pX, fY);
      ctx.lineTo(pX + pW, fY);
      ctx.stroke();

      // Headline
      ctx.font = '800 36px "Outfit"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(headline.toUpperCase(), pX + 40, fY + 115);

      // Subheadline
      ctx.font = '500 30px "Inter"';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(subHeadline, pX + 40, fY + 160);

      // Branding tag (Insta ID)
      ctx.font = '700 30px "Outfit"';
      ctx.fillStyle = '#10b981'; // Green accent
      ctx.fillText(brandingText.toUpperCase(), pX + 40, fY + 60);


      // Right Circle (White background, filled with logo)
      const mapR = 90;
      const mapCX = pX + pW - 40 - mapR;
      const mapCY = fY + fH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(mapCX, mapCY, mapR, 0, Math.PI * 2);
      ctx.fillStyle = '#e8e8e8';
      ctx.fill();
      ctx.clip();

      if (logoImg) {
        // Size the logo to fit nicely in the circle
        const logoH = mapR * 1.5;
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        ctx.drawImage(logoImg, mapCX - logoW / 2, mapCY - logoH / 2, logoW, logoH);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(mapCX, mapCY, mapR, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

    } else if (template === 'stamp') {
      // --- TRAVELER STAMP ---
      ctx.fillStyle = '#f8f5f0';
      ctx.fillRect(0, 0, 1080, 1080);

      const iX = 60, iY = 140, iW = 960, iH = 660;
      ctx.save();
      ctx.beginPath();
      ctx.rect(iX, iY, iW, iH);
      ctx.clip();
      ctx.drawImage(blurredCanvas, iX - 20, iY - 20, iW + 40, iH + 40);
      ctx.restore();

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#d6d3cc';
      ctx.strokeRect(iX, iY, iW, iH);

      // Branding tag
      ctx.font = '700 30px "Outfit"';
      ctx.fillStyle = '#10b981';
      ctx.fillText(brandingText.toUpperCase(), iX, iY + iH + 60);

      ctx.font = '800 36px "Outfit"';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(headline.toUpperCase(), iX, iY + iH + 110);

      ctx.font = '500 30px "Inter"';
      ctx.fillStyle = '#64748b';
      ctx.fillText(subHeadline, iX, iY + iH + 150);

      const mapR = 130;
      const mapCX = iX + iW - 100;
      const mapCY = iY + iH;
      ctx.save();
      ctx.beginPath();
      ctx.arc(mapCX, mapCY, mapR, 0, Math.PI * 2);
      ctx.fillStyle = '#e8e8e8';
      ctx.fill();
      ctx.clip();

      if (logoImg) {
        const logoH = mapR * 1.5;
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        ctx.drawImage(logoImg, mapCX - logoW / 2, mapCY - logoH / 2, logoW, logoH);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(mapCX, mapCY, mapR, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f8f5f0';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mapCX, mapCY, mapR + 6, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();

    } else if (template === 'grid') {
      // --- URBAN GRID ---
      const splitY = 600;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1080, splitY);
      ctx.clip();
      ctx.drawImage(blurredCanvas, 0, 0, 1080, splitY + 40);
      ctx.restore();

      ctx.fillStyle = '#10b981'; // Green brand color for EV
      ctx.fillRect(0, splitY, 1080, 20);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, splitY + 20, 1080, 1080 - (splitY + 20));
      ctx.clip();
      await stitchMapToCanvas(ctx, 1080, 1080 - (splitY + 20), location.lat, location.lng, location.zoom, 'dark');
      ctx.restore();

      const boxW = 800;
      const boxH = 260;
      const boxX = 140;
      const boxY = splitY + 80;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(boxX, boxY, 12, boxH);

      const logoCircleR = 60;
      const logoCircleCX = boxX + 40 + logoCircleR;
      const logoCircleCY = boxY + 40 + logoCircleR;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCircleCX, logoCircleCY, logoCircleR, 0, Math.PI * 2);
      ctx.fillStyle = '#e8e8e8';
      ctx.fill();
      ctx.clip();
      if (logoImg) {
        const logoH = logoCircleR * 1.5;
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        ctx.drawImage(logoImg, logoCircleCX - logoW / 2, logoCircleCY - logoH / 2, logoW, logoH);
      }
      ctx.restore();

      // Branding tag
      ctx.font = '700 30px "Outfit"';
      ctx.fillStyle = '#10b981';
      ctx.fillText(brandingText.toUpperCase(), boxX + 200, boxY + 60);

      ctx.font = '900 44px "Outfit"';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(headline.toUpperCase(), boxX + 40, boxY + 180);

      ctx.font = '600 30px "Inter"';
      ctx.fillStyle = '#64748b';
      ctx.fillText(subHeadline, boxX + 40, boxY + 225);

    } else if (template === 'luxury') {
      // --- LUX MINIMALIST ---
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, 1080, 1080);

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(40, 40, 1000, 1000);
      ctx.lineWidth = 3;
      ctx.strokeRect(52, 52, 976, 976);

      const logoCircleR = 70;
      const logoCircleCX = 540;
      const logoCircleCY = 140;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCircleCX, logoCircleCY, logoCircleR, 0, Math.PI * 2);
      ctx.fillStyle = '#e8e8e8';
      ctx.fill();
      ctx.clip();
      if (logoImg) {
        const logoH = logoCircleR * 1.5;
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        ctx.drawImage(logoImg, logoCircleCX - logoW / 2, logoCircleCY - logoH / 2, logoW, logoH);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(logoCircleCX, logoCircleCY, logoCircleR, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      const imgX = 100, imgY = 240, imgW = 880, imgH = 480;
      ctx.save();
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();
      ctx.drawImage(blurredCanvas, imgX - 20, imgY - 20, imgW + 40, imgH + 40);
      ctx.restore();

      ctx.font = '800 56px "Outfit"';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(headline.toUpperCase(), 540, 810);

      ctx.font = '500 30px "Inter"';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(subHeadline, 540, 860);
      ctx.textAlign = 'left';

      // Branding tag
      ctx.font = '700 30px "Outfit"';
      ctx.fillStyle = '#10b981';
      ctx.fillText(brandingText.toUpperCase(), 358, 970);

      const mapW = 400, mapH = 100;
      const mapX = 540 - mapW / 2;
      const mapY = 910;
      ctx.save();
      ctx.beginPath();
      ctx.rect(mapX, mapY, mapW, mapH);
      ctx.clip();
      await stitchMapToCanvas(ctx, mapW, mapH, location.lat, location.lng, location.zoom, 'dark');
      ctx.restore();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(mapX, mapY, mapW, mapH);
    }

    // Save output preview
    setPreviewUrl(canvas.toDataURL('image/png'));
    setIsGenerating(false);
  };

  // Trigger render on config changes
  useEffect(() => {
    renderCanvas();
  }, [image, blurZones, location, template, headline, subHeadline, brandingText]);

  // Export prepared post assets
  const handlePreparePublish = () => {
    if (!previewUrl) return;
    onPublishPrepared({
      imageUrl: previewUrl,
      headline,
      subHeadline,
      brandingText
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Template & Text controls - 5 cols */}
      <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
        {/* Template Selectors */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            1. Select Post Layout
          </h4>

          <div className="flex flex-col gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setTemplate(tpl.id)}
                className={`p-3 text-left rounded-lg border transition-all flex flex-col ${template === tpl.id
                  ? 'bg-purple-600/10 border-purple-500 text-purple-200'
                  : 'bg-transparent border-white/5 hover:border-white/10 text-gray-400'
                  }`}
              >
                <span className="text-xs font-bold text-white mb-0.5">{tpl.name}</span>
                <span className="text-[10px] text-gray-400">{tpl.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Inputs */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-purple-400" />
            2. Edit Post Text Overlays
          </h4>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Headline</label>
              <input
                type="text"
                className="input-field text-xs py-2"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={60}
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Subheadline / Quote</label>
              <input
                type="text"
                className="input-field text-xs py-2"
                value={subHeadline}
                onChange={(e) => setSubHeadline(e.target.value)}
                maxLength={80}
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Branding Tag / Username</label>
              <input
                type="text"
                className="input-field text-xs py-2"
                value={brandingText}
                onChange={(e) => setBrandingText(e.target.value)}
                maxLength={25}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mockup Preview - 7 cols */}
      <div className="lg:col-span-7 flex flex-col gap-4 items-center justify-start order-1 lg:order-2">
        {/* Aspect Ratio Header */}
        <div className="w-full flex items-center justify-between text-xs text-gray-400 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Eye className="w-4 h-4 text-purple-400" />
            Live Instagram Post Mockup (1080 × 1080)
          </span>
          <span className="bg-slate-900 border border-white/5 py-1 px-2.5 rounded-full text-[10px] font-mono">
            1:1 Square
          </span>
        </div>

        {/* Hidden internal canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Outer Visual Container */}
        <div className="relative w-full aspect-square max-w-[420px] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950 flex items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
              <span className="text-xs text-gray-400">Rendering high-res post...</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Instagram Post Composition"
              className="w-full h-full object-contain block"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500 text-xs text-center p-6">
              <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
              Upload an image on the left to start generating your post composition.
            </div>
          )}
        </div>

        {/* Publish/Download Button */}
        <button
          onClick={handlePreparePublish}
          disabled={!previewUrl || isGenerating}
          className="btn-accent w-full max-w-[420px] py-3.5 flex items-center justify-center gap-2 font-bold text-sm"
        >
          <Download className="w-4 h-4" />
          Prepare & Post to Instagram
        </button>
      </div>
    </div>
  );
}
