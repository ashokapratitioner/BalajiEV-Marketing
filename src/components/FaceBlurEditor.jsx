import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

export default function FaceBlurEditor({ image, blurZones, setBlurZones }) {
  const [blurType, setBlurType] = useState('blur'); // 'blur' or 'pixelate'
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Load face-api.js dynamically from CDN
  useEffect(() => {
    if (window.faceapi) {
      setFaceApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js';
    script.async = true;
    script.onload = () => {
      setFaceApiLoaded(true);
    };
    script.onerror = () => {
      setDetectionError('Could not load face-detection library from CDN. Manual blurring is fully functional.');
    };
    document.body.appendChild(script);

    return () => {
      // Clean up if needed
    };
  }, []);

  // Pre-load image into HTMLImageElement
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.src = image.url;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [image, blurZones, selectedZoneId]);

  // Handle canvas drawing
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    
    // Set internal resolution to match actual image resolution
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0);

    // 2. Render each blur zone
    blurZones.forEach((zone) => {
      const cx = (zone.x / 100) * canvas.width;
      const cy = (zone.y / 100) * canvas.height;
      const r = (zone.r / 100) * Math.min(canvas.width, canvas.height);

      ctx.save();
      
      // Create circular clipping path for this zone
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      if (zone.type === 'pixelate') {
        // Pixelate effect: draw tiny, then stretch
        const size = Math.max(8, Math.round(r / 6)); // block size scale
        const sWidth = r * 2;
        const sHeight = r * 2;
        const sx = cx - r;
        const sy = cy - r;

        // Create temporary offscreen canvas for pixelation
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const oCtx = offscreen.getContext('2d');
        oCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, size, size);

        // Draw pixelated image back onto main canvas
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, size, size, sx, sy, sWidth, sHeight);
      } else {
        // Blur effect
        ctx.filter = 'blur(18px)';
        ctx.drawImage(img, 0, 0);
      }

      ctx.restore();

      // 3. Draw border overlays for editing in UI (scaled to display size)
      // Note: We only draw edit rings in the editor view, NOT when exporting
    });
  };

  // Perform client-side face detection
  const detectFaces = async () => {
    if (!faceApiLoaded || !window.faceapi) {
      setDetectionError('Face API is still loading. Please wait.');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    try {
      const faceapi = window.faceapi;
      
      // Load the lightweight TinyFaceDetector model
      const modelUrl = 'https://vladmandic.github.io/face-api/model/';
      
      if (!faceapi.nets.tinyFaceDetector.params) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
      }

      const imgElement = imageRef.current;
      if (!imgElement) throw new Error('Image not loaded yet.');

      // Run detector
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
      const detections = await faceapi.detectAllFaces(imgElement, options);

      if (detections.length === 0) {
        setDetectionError('No faces detected automatically. Try adding blur circles manually!');
        setIsDetecting(false);
        return;
      }

      // Map detections to our relative format
      const newZones = detections.map((det, idx) => {
        const box = det.box;
        
        // Find center of box
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        // Use diagonal or max dimension for radius
        const radius = Math.max(box.width, box.height) / 1.5;

        // Convert to percentages
        const xPercent = (centerX / imgElement.naturalWidth) * 100;
        const yPercent = (centerY / imgElement.naturalHeight) * 100;
        const rPercent = (radius / Math.min(imgElement.naturalWidth, imgElement.naturalHeight)) * 100;

        return {
          id: Date.now() + idx,
          x: Math.min(100, Math.max(0, xPercent)),
          y: Math.min(100, Math.max(0, yPercent)),
          r: Math.min(50, Math.max(3, rPercent)),
          type: blurType
        };
      });

      setBlurZones((prev) => [...prev, ...newZones]);
      
      if (newZones.length > 0) {
        setSelectedZoneId(newZones[newZones.length - 1].id);
      }
    } catch (err) {
      console.error(err);
      setDetectionError('Error running automatic face detection. Please use manual blur.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Click on canvas to add or select a zone
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked close to an existing zone center
    const clickedZone = blurZones.find((zone) => {
      const dist = Math.sqrt(Math.pow(zone.x - clickX, 2) + Math.pow(zone.y - clickY, 2));
      return dist < (zone.r * 1.5); // tolerance factor
    });

    if (clickedZone) {
      setSelectedZoneId(clickedZone.id);
    } else {
      // Add a new zone
      const newZone = {
        id: Date.now(),
        x: clickX,
        y: clickY,
        r: 8, // default radius percent
        type: blurType
      };
      setBlurZones((prev) => [...prev, newZone]);
      setSelectedZoneId(newZone.id);
    }
  };

  // Delete a zone
  const deleteZone = (id) => {
    setBlurZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedZoneId === id) {
      setSelectedZoneId(null);
    }
  };

  // Adjust radius of the selected zone
  const handleRadiusChange = (e) => {
    const newRadius = parseFloat(e.target.value);
    setBlurZones((prev) =>
      prev.map((z) => (z.id === selectedZoneId ? { ...z, r: newRadius } : z))
    );
  };

  // Toggle blur type of the selected zone
  const toggleZoneType = (id, type) => {
    setBlurZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, type: type } : z))
    );
  };

  const selectedZone = blurZones.find((z) => z.id === selectedZoneId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Face & Privacy Blurring
        </h3>
        
        <button
          onClick={detectFaces}
          disabled={isDetecting}
          className="btn-primary py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2"
        >
          {isDetecting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Scanning Image...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Detect Faces
            </>
          )}
        </button>
      </div>

      {detectionError && (
        <div className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          {detectionError}
        </div>
      )}

      {/* Editor Canvas Container */}
      <div className="flex flex-col items-center">
        <div 
          ref={containerRef}
          className="relative max-w-full rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-crosshair bg-slate-950"
          style={{ minHeight: '200px' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="block max-w-full h-auto object-contain mx-auto"
            style={{ maxHeight: '420px' }}
          />

          {/* Render visual editor rings over canvas */}
          {blurZones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            return (
              <div
                key={zone.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedZoneId(zone.id);
                }}
                className={`absolute rounded-full border-2 transition-all pointer-events-auto cursor-pointer ${
                  isSelected 
                    ? 'border-purple-400 shadow-[0_0_12px_rgba(139,92,246,0.6)] bg-purple-500/10' 
                    : 'border-white/50 hover:border-white'
                }`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.r * 2}%`,
                  height: `${zone.r * 2}%`,
                  transform: 'translate(-50%, -50%)',
                  // Adjust percentages based on container aspect ratio
                  aspectRatio: '1 / 1'
                }}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          💡 Click anywhere on the image to add a blur circle. Click an existing ring to edit or delete it.
        </p>
      </div>

      {/* Controls for selected zone */}
      {selectedZone ? (
        <div className="glass-panel p-4 flex flex-col gap-4 border-purple-500/20 bg-purple-950/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-300">
              Editing Blur Circle
            </span>
            <button
              onClick={() => deleteZone(selectedZone.id)}
              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Delete zone"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleZoneType(selectedZone.id, 'blur')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                selectedZone.type === 'blur'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                  : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              Gaussian Blur
            </button>
            <button
              onClick={() => toggleZoneType(selectedZone.id, 'pixelate')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                selectedZone.type === 'pixelate'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                  : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
              Retro Pixelate
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Blur Size / Radius</span>
              <span className="text-purple-300">{Math.round(selectedZone.r)}%</span>
            </div>
            <input
              type="range"
              min="3"
              max="35"
              step="0.5"
              value={selectedZone.r}
              onChange={handleRadiusChange}
            />
          </div>
        </div>
      ) : (
        blurZones.length > 0 && (
          <div className="text-center text-xs text-gray-500">
            Click on any circle to adjust its style or resize it.
          </div>
        )
      )}
    </div>
  );
}
