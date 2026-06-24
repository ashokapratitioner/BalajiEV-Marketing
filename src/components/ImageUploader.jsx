import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import EXIF from 'exif-js';

// Helper to convert EXIF DMS GPS coordinates to Decimal Degrees
const convertDMSToDD = (degrees, minutes, seconds, direction) => {
  if (!degrees) return null;
  
  // EXIF values can be Number objects or fractions (from exif-js)
  const deg = typeof degrees === 'object' ? degrees.numerator / degrees.denominator : degrees;
  const min = typeof minutes === 'object' ? minutes.numerator / minutes.denominator : minutes;
  const sec = typeof seconds === 'object' ? seconds.numerator / seconds.denominator : seconds;
  
  let dd = deg + min / 60 + sec / 3600;
  if (direction === 'S' || direction === 'W') {
    dd = dd * -1;
  }
  return dd;
};

export default function ImageUploader({ onImageLoaded }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState(null);

  const processFile = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const imgDataUrl = e.target.result;
      
      // Parse EXIF
      EXIF.getData(file, function () {
        const lat = EXIF.getTag(this, 'GPSLatitude');
        const lon = EXIF.getTag(this, 'GPSLongitude');
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
        const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');
        
        let coordinates = null;
        if (lat && lon && latRef && lonRef) {
          const latitude = convertDMSToDD(lat[0], lat[1], lat[2], latRef);
          const longitude = convertDMSToDD(lon[0], lon[1], lon[2], lonRef);
          
          if (!isNaN(latitude) && !isNaN(longitude)) {
            coordinates = { lat: latitude, lng: longitude };
          }
        }

        // Try to get date and camera info too
        const dateTaken = EXIF.getTag(this, 'DateTimeOriginal') || EXIF.getTag(this, 'DateTime');
        const cameraMake = EXIF.getTag(this, 'Make');
        const cameraModel = EXIF.getTag(this, 'Model');

        onImageLoaded({
          url: imgDataUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          gps: coordinates,
          meta: {
            dateTaken,
            camera: cameraMake && cameraModel ? `${cameraMake} ${cameraModel}` : null
          }
        });
      });
    };

    reader.onerror = () => {
      setError('Failed to read image file.');
    };

    reader.readAsDataURL(file);
  }, [onImageLoaded]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  return (
    <div className="w-full">
      <div
        className={`glass-panel p-8 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
          isDragActive 
            ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' 
            : 'border-white/10 hover:border-white/20'
        } ${error ? 'border-red-500/30' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('image-file-input').click()}
      >
        <input
          type="file"
          id="image-file-input"
          className="hidden"
          accept="image/*"
          onChange={handleFileInput}
        />
        
        <div className="p-4 rounded-full bg-white/5 mb-4 text-purple-400 group-hover:scale-110 transition-transform duration-200">
          <Upload className="w-10 h-10" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Drag and drop your image</h3>
        <p className="text-sm text-gray-400 mb-1">
          Supports PNG, JPG, JPEG, and WebP formats
        </p>
        <p className="text-xs text-gray-500">
          EXIF GPS metadata will be automatically parsed to set the map location
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
