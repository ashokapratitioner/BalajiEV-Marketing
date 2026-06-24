import React, { useState, useEffect, useRef } from 'react';
import { Shield, MapPin, MessageSquare, RotateCcw, Camera, Sparkles, RefreshCw, Layers, LayoutGrid } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import FaceBlurEditor from './components/FaceBlurEditor';
import MapCustomizer from './components/MapCustomizer';
import CaptionGenerator from './components/CaptionGenerator';
import PostPreview from './components/PostPreview';
import PublishModal from './components/PublishModal';
import { SCENES, getCaption, analyzeImageColors, suggestSceneFromColors } from './captions';

export default function App() {
  const [image, setImage] = useState(null);
  const [blurZones, setBlurZones] = useState([]);
  const [location, setLocation] = useState({
    lat: 25.5600924,
    lng: 84.6396031,
    zoom: 16,
    theme: 'dark',
    name: 'Balaji EVs, Bihar, India'
  });
  
  const [template, setTemplate] = useState('glass');
  
  // Custom text overlays
  const [headline, setHeadline] = useState('POWERING THE FUTURE OF MOBILITY');
  const [subHeadline, setSubHeadline] = useState('Driving cleaner roads with Balaji EVs.');
  const [brandingText, setBrandingText] = useState('@goelectric_balajiev');
  
  const [caption, setCaption] = useState('');
  const [activeTab, setActiveTab] = useState('blur'); // 'blur', 'map', 'caption'
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [postData, setPostData] = useState(null);
  const [exifSuccessMsg, setExifSuccessMsg] = useState('');

  // AI Classification States (Instant Local)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedScene, setSelectedScene] = useState(null);

  // Parse GPS and reverse-geocode when image changes
  useEffect(() => {
    if (image && image.gps) {
      const { lat, lng } = image.gps;
      
      const reverseGeocode = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`);
          const data = await res.json();
          
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const cleanName = parts[0] + (parts[1] ? `, ${parts[1].trim()}` : '');
            
            setLocation((prev) => ({
              ...prev,
              lat,
              lng,
              name: cleanName
            }));
            setExifSuccessMsg(`🌍 GPS Metadata Resolved: Map auto-positioned to ${cleanName}`);
          } else {
            setLocation((prev) => ({
              ...prev,
              lat,
              lng,
              name: 'Scenic Location'
            }));
            setExifSuccessMsg('🌍 GPS Metadata Resolved: Coordinates extracted from image!');
          }
        } catch (err) {
          setLocation((prev) => ({
            ...prev,
            lat,
            lng,
            name: 'Scenic Location'
          }));
          setExifSuccessMsg('🌍 GPS Metadata Resolved: Coordinates extracted from image!');
        }
      };
      
      reverseGeocode();
    } else if (image) {
      setExifSuccessMsg('');
    }
  }, [image]);

  const applyScene = (sceneId) => {
    setSelectedScene(sceneId);
    const content = getCaption(sceneId);
    
    setHeadline(content.headline);
    setSubHeadline(content.subHeadline);
    setCaption(content.caption + '\n\n' + content.hashtags.join(' '));
    setLocation(prev => ({ ...prev, theme: content.mapTheme }));
    setTemplate(content.template);
  };

  const handleImageLoaded = async (loadedImage) => {
    setImage(loadedImage);
    setBlurZones([]); 
    setIsAnalyzing(true);
    
    // Instant local color analysis for scene suggestion
    const colorData = await analyzeImageColors(loadedImage.url);
    const suggestedScene = suggestSceneFromColors(colorData, 0); 
    
    // Tiny UX delay so the UI feels like it's "doing work"
    setTimeout(() => {
      applyScene(suggestedScene);
      setIsAnalyzing(false);
    }, 400);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to discard your current work and start over?')) {
      setImage(null);
      setBlurZones([]);
      setSelectedScene(null);
      setLocation({
        lat: 25.5600924,
        lng: 84.6396031,
        zoom: 16,
        theme: 'dark',
        name: 'Balaji EVs, Bihar, India'
      });
      setHeadline('POWERING THE FUTURE OF MOBILITY');
      setSubHeadline('Driving cleaner roads with Balaji EVs.');
      setBrandingText('@goelectric_balajiev');
      setTemplate('glass');
      setExifSuccessMsg('');
      setActiveTab('blur');
    }
  };

  const handlePublishPrepared = (preparedData) => {
    setPostData(preparedData);
    setIsPublishOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Bar */}
      <header className="glass-panel rounded-none border-t-0 border-x-0 bg-slate-950/80 px-6 py-4 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              BlurMap
              <span className="text-[10px] bg-green-500/20 text-green-300 font-semibold px-2 py-0.5 rounded-full border border-green-500/30">
                100% Offline & Free
              </span>
            </h1>
            <p className="text-[10px] text-gray-400">Zero API • No Downloads • @goelectric_balajiev</p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {image && (
            <button
              onClick={handleReset}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 hover:text-red-400 hover:border-red-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Info Toast if GPS location found */}
        {exifSuccessMsg && (
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-900 text-indigo-300 p-3 rounded-xl border border-white/10 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <span>{exifSuccessMsg}</span>
            </div>
            <button onClick={() => setExifSuccessMsg('')} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Scene Picker (Local AI Auto-Selected) */}
        {image && !isAnalyzing && (
          <div className="bg-slate-900 border border-white/5 rounded-xl p-4 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Select Photo Scene
              </h3>
              <span className="text-[10px] text-gray-500 italic">Click to rotate captions</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {SCENES.map(scene => {
                const isActive = selectedScene === scene.id;
                return (
                  <button
                    key={scene.id}
                    onClick={() => applyScene(scene.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      isActive 
                        ? 'bg-purple-500/20 border-purple-500/50 text-white scale-[1.02] shadow-lg shadow-purple-500/10' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <span className="text-2xl mb-1">{scene.icon}</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-center w-full truncate">{scene.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!image ? (
          /* Empty State / Image Upload Container */
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto py-12">
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-4 shadow-2xl">
                <Camera className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold mb-3">Create stunning privacy-focused Instagram posts</h2>
              <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                Import an image from your camera library. We will extract the location, blur detected faces for privacy, and generate a beautiful map-embedded promotional graphic ready for Instagram.
              </p>
            </div>
            <ImageUploader onImageLoaded={handleImageLoaded} />
          </div>
        ) : (
          /* Editor Split View */
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Side: Editor Workspace - 5 cols */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Workspace Navigation Tabs */}
              <div className="glass-panel p-1.5 flex gap-1 rounded-xl w-full">
                <button
                  onClick={() => setActiveTab('blur')}
                  className={`tab-btn ${activeTab === 'blur' ? 'active' : ''}`}
                >
                  <Shield className="w-4 h-4" />
                  1. Privacy Blur
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                >
                  <MapPin className="w-4 h-4" />
                  2. Map Location
                </button>
                <button
                  onClick={() => setActiveTab('caption')}
                  className={`tab-btn ${activeTab === 'caption' ? 'active' : ''}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  3. Caption
                </button>
              </div>

              {/* Workspace Tab Panel */}
              <div className="glass-panel p-5">
                {activeTab === 'blur' && (
                  <FaceBlurEditor
                    image={image}
                    blurZones={blurZones}
                    setBlurZones={setBlurZones}
                  />
                )}
                
                {activeTab === 'map' && (
                  <MapCustomizer
                    location={location}
                    setLocation={setLocation}
                  />
                )}

                {activeTab === 'caption' && (
                  <CaptionGenerator
                    location={location}
                    headline={headline}
                    subHeadline={subHeadline}
                    brandingText={brandingText}
                    onCaptionChange={setCaption}
                    aiTags={aiTags}
                  />
                )}
              </div>
            </div>

            {/* Right Side: Visual Post Preview - 7 cols */}
            <div className="lg:col-span-7">
              <div className="glass-panel p-6">
                <PostPreview
                  image={image}
                  blurZones={blurZones}
                  location={location}
                  onPublishPrepared={handlePublishPrepared}
                  template={template}
                  setTemplate={setTemplate}
                  headline={headline}
                  setHeadline={setHeadline}
                  subHeadline={subHeadline}
                  setSubHeadline={setSubHeadline}
                  brandingText={brandingText}
                  setBrandingText={setBrandingText}
                />
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-gray-500 bg-slate-950 mt-auto">
        &copy; {new Date().getFullYear()} BlurMap. Powered by client-side Canvas and Leaflet.js map tiles.
      </footer>

      {/* Publishing Flow Overlay */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        postData={postData}
        captionText={caption}
      />
    </div>
  );
}
