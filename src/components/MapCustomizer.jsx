import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import L from 'leaflet';

// Constants for Map styles
export const MAP_THEMES = [
  { id: 'dark', name: 'Minimalist Dark', tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', cssClass: 'map-dark' },
  { id: 'light', name: 'Clean Light', tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', cssClass: 'map-light' },
  { id: 'gold', name: 'Vintage Gold', tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', cssClass: 'map-gold' },
  { id: 'neon', name: 'Cyber Neon', tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', cssClass: 'map-neon' },
];

// Helper to convert lat/lng to OpenStreetMap tile coordinates
export const getTileCoords = (lat, lng, zoom) => {
  const x = (lng + 180) / 360 * Math.pow(2, zoom);
  const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
  return { x, y, tileX: Math.floor(x), tileY: Math.floor(y) };
};

// Canvas stitcher to render a map of specified size (width x height) onto a canvas context
export const stitchMapToCanvas = async (ctx, canvasWidth, canvasHeight, lat, lng, zoom, themeId) => {
  const theme = MAP_THEMES.find(t => t.id === themeId) || MAP_THEMES[0];
  const tileUrlTemplate = theme.tileUrl;

  const { x, y, tileX, tileY } = getTileCoords(lat, lng, zoom);
  const tileSize = 256;

  // Calculate pixel offsets for center
  const centerOffsetX = (x - tileX) * tileSize;
  const centerOffsetY = (y - tileY) * tileSize;

  const targetCenterX = canvasWidth / 2;
  const targetCenterY = canvasHeight / 2;

  // Determine how many tiles we need to cover the canvas
  const tilesNeededX = Math.ceil(canvasWidth / tileSize) + 2;
  const tilesNeededY = Math.ceil(canvasHeight / tileSize) + 2;

  const startTileOffsetX = -Math.floor(tilesNeededX / 2);
  const startTileOffsetY = -Math.floor(tilesNeededY / 2);

  const tilePromises = [];

  for (let dx = startTileOffsetX; dx <= -startTileOffsetX; dx++) {
    for (let dy = startTileOffsetY; dy <= -startTileOffsetY; dy++) {
      const currentTileX = tileX + dx;
      const currentTileY = tileY + dy;

      // Handle tile boundaries
      const maxTileIndex = Math.pow(2, zoom);
      if (currentTileY < 0 || currentTileY >= maxTileIndex) continue;
      const wrappedTileX = ((currentTileX % maxTileIndex) + maxTileIndex) % maxTileIndex;

      // Select random subdomain
      const subdomains = ['a', 'b', 'c', 'd'];
      const sub = subdomains[Math.abs(wrappedTileX + currentTileY) % subdomains.length];
      
      const url = tileUrlTemplate
        .replace('{s}', sub)
        .replace('{z}', zoom)
        .replace('{x}', wrappedTileX)
        .replace('{y}', currentTileY)
        .replace('{r}', '');

      const imgX = targetCenterX - centerOffsetX + (dx * tileSize);
      const imgY = targetCenterY - centerOffsetY + (dy * tileSize);

      tilePromises.push(new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => resolve({ img, x: imgX, y: imgY, success: true });
        img.onerror = () => resolve({ success: false });
      }));
    }
  }

  const loadedTiles = await Promise.all(tilePromises);

  // Apply filters on canvas if necessary
  ctx.save();
  
  if (themeId === 'gold') {
    // Vintage Gold filter simulation on canvas
    ctx.filter = 'sepia(0.8) hue-rotate(-20deg) contrast(1.1)';
  } else if (themeId === 'neon') {
    // Cyber Neon filter: invert and saturate
    ctx.filter = 'invert(1) hue-rotate(240deg) saturate(2.5) contrast(1.2)';
  } else if (themeId === 'light') {
    ctx.filter = 'grayscale(1) brightness(1.05)';
  }

  // Draw tiles
  loadedTiles.forEach(tile => {
    if (tile.success) {
      ctx.drawImage(tile.img, tile.x, tile.y, tileSize, tileSize);
    }
  });

  ctx.restore();

  // Draw Marker Pin in center
  ctx.save();
  ctx.beginPath();
  ctx.arc(targetCenterX, targetCenterY, 8, 0, Math.PI * 2);
  ctx.fillStyle = themeId === 'neon' ? '#ec4899' : '#8b5cf6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  
  // Outer pulse circle static representation
  ctx.beginPath();
  ctx.arc(targetCenterX, targetCenterY, 18, 0, Math.PI * 2);
  ctx.strokeStyle = themeId === 'neon' ? 'rgba(236,72,153,0.3)' : 'rgba(139,92,246,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
};

export default function MapCustomizer({ location, setLocation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      // Create Leaflet instance
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true
      }).setView([location.lat, location.lng], location.zoom);

      // Custom marker icon using DivIcon to avoid Vite relative asset issues
      const pinHtml = `
        <div class="relative w-6 h-6 -translate-x-[6px] -translate-y-[6px]">
          <div class="absolute w-6 h-6 rounded-full bg-purple-500/30 animate-ping"></div>
          <div class="w-3 h-3 rounded-full bg-purple-500 border border-white absolute top-1.5 left-1.5 shadow-md"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-leaflet-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      markerInstance.current = L.marker([location.lat, location.lng], { icon: customIcon })
        .addTo(mapInstance.current);
    }

    // Set view and marker location
    mapInstance.current.setView([location.lat, location.lng], location.zoom);
    markerInstance.current.setLatLng([location.lat, location.lng]);

    // Cleanup and rebuild layer based on theme
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const activeTheme = MAP_THEMES.find(t => t.id === location.theme) || MAP_THEMES[0];
    
    // Add CartoDB tile layer
    L.tileLayer(activeTheme.tileUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    }).addTo(mapInstance.current);

  }, [location.lat, location.lng, location.zoom, location.theme]);

  // Handle Search using Nominatim API
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Extract a shorter, clean address for the Instagram text
    const addressParts = result.display_name.split(',');
    const cleanName = addressParts[0] + (addressParts[1] ? `, ${addressParts[1].trim()}` : '');

    setLocation(prev => ({
      ...prev,
      lat,
      lng,
      name: cleanName
    }));
    
    setSearchResults([]);
    setSearchQuery(cleanName);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          Location & Map Settings
        </h3>
      </div>

      {/* Address Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field pr-10"
            placeholder="Search address or landmark (e.g. Balaji EVs, Ara)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary py-2 px-3 shrink-0 flex items-center justify-center"
            disabled={isSearching}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-2xl z-[1000] max-h-[200px] overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.place_id}
                className="p-2.5 hover:bg-white/5 cursor-pointer text-xs border-b border-white/5 flex flex-col gap-0.5"
                onClick={() => selectSearchResult(result)}
              >
                <span className="font-semibold text-gray-200 text-ellipsis overflow-hidden whitespace-nowrap">
                  {result.display_name.split(',')[0]}
                </span>
                <span className="text-gray-400 text-ellipsis overflow-hidden whitespace-nowrap">
                  {result.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Map Theme & Zoom Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-gray-400 block mb-1">Map Theme</label>
          <select
            className="input-field py-2 text-xs"
            value={location.theme}
            onChange={(e) => setLocation(prev => ({ ...prev, theme: e.target.value }))}
          >
            {MAP_THEMES.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Zoom Level</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocation(prev => ({ ...prev, zoom: Math.max(2, prev.zoom - 1) }))}
              className="btn-secondary p-2 flex-1 flex justify-center items-center"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-semibold">{location.zoom}</span>
            <button
              onClick={() => setLocation(prev => ({ ...prev, zoom: Math.min(19, prev.zoom + 1) }))}
              className="btn-secondary p-2 flex-1 flex justify-center items-center"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Location Text Override */}
      <div>
        <label className="text-gray-400 text-xs block mb-1">Display Label on Post</label>
        <input
          type="text"
          className="input-field text-xs py-2"
          placeholder="e.g. Balaji EVs, Bihar, India"
          value={location.name}
          onChange={(e) => setLocation(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      {/* Map Container View */}
      <div className="relative w-full h-[180px] rounded-xl overflow-hidden border border-white/10 shadow-inner">
        <div 
          ref={mapRef} 
          className={`w-full h-full ${
            location.theme === 'dark' ? 'map-dark' :
            location.theme === 'gold' ? 'map-gold' :
            location.theme === 'neon' ? 'map-neon' :
            location.theme === 'light' ? 'map-light' : ''
          }`}
        />
      </div>
    </div>
  );
}
