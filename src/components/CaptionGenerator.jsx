import React, { useState, useEffect } from 'react';
import { Copy, Check, MessageSquare, Compass, Sparkles } from 'lucide-react';

const TONES = [
  { id: 'luxury', name: 'Luxury ✨', icon: '✨' },
  { id: 'adventurous', name: 'Adventurous 🏔️', icon: '🏔️' },
  { id: 'professional', name: 'Professional 💼', icon: '💼' },
  { id: 'casual', name: 'Casual/Fun 🎉', icon: '🎉' },
];

export default function CaptionGenerator({ location, headline, subHeadline, brandingText, onCaptionChange, aiTags }) {
  const [tone, setTone] = useState('luxury');
  const [captionText, setCaptionText] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate caption based on input parameters
  const generateCaption = (activeTone) => {
    const locName = location.name || 'this beautiful spot';
    const tag = brandingText || '@mycompany';
    const cleanHash = locName.replace(/[^a-zA-Z0-9]/g, '');
    const locationHashtag = cleanHash ? `#${cleanHash}` : '';
    
    // Dynamic AI tags and hashtags insertion
    const aiDetails = aiTags && aiTags.length > 0 
      ? ` Highlighting elements of ${aiTags.slice(0, 2).join(' & ')}.` 
      : '';
    const aiHashtags = aiTags && aiTags.length > 0
      ? ' ' + aiTags.map(t => '#' + t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).join(' ')
      : '';

    let text = '';
    
    switch (activeTone) {
      case 'luxury':
        text = `A perfect retreat in ${locName}.${aiDetails} Discovering the elegance of this stunning destination where every detail speaks of refined luxury. ✨\n\n❝ ${subHeadline || headline} ❞\n\n📍 ${locName}\n\nPresented by ${tag}\n\n#luxurytravel #exclusive #lifestyle #travelgoals #instatravel #getaway ${locationHashtag}${aiHashtags}`;
        break;
      case 'adventurous':
        text = `Off the grid in ${locName}! 🌍 Taking in the sights of ${aiTags && aiTags[0] ? aiTags[0] : 'our new destination'}. Exploring new horizons, uncovering local secrets, and sharing the adventure. Life is short, let's explore! 🥾🏔️\n\n🔥 ${headline}\n\n📍 Location: ${locName}\n\nFollow ${tag} for more adventures!\n\n#wanderlust #adventure #explore #travelgram #nature #offthebeatenpath ${locationHashtag}${aiHashtags}`;
        break;
      case 'professional':
        text = `We are proud to highlight this premier location in ${locName}.${aiTags && aiTags.length > 0 ? ` Special focus on our analysis of ${aiTags.join(' & ')}.` : ''} Combining premium quality with the unique character of the local community. 🏢🤝\n\n💼 ${headline} — ${subHeadline}\n\n📍 Location: ${locName}\n\nLearn more via our link in bio or contact ${tag}.\n\n#realestate #locationlocationlocation #business #branding #architecture #development ${locationHashtag}${aiHashtags}`;
        break;
      case 'casual':
        text = `Sending you a postcard from ${locName}! 📸 Just taking in all the positive vibes, featuring ${aiTags && aiTags[0] ? aiTags[0] : 'beautiful views'}. Tag someone who needs to see this! 👇\n\n✨ ${headline}\n\n📍 ${locName}\n\nShot by ${tag}\n\n#travelvibes #postcard #fun #happyplace #places #instadaily ${locationHashtag}${aiHashtags}`;
        break;
      default:
        text = '';
    }

    setCaptionText(text);
    onCaptionChange(text);
  };

  // Re-generate whenever inputs change
  useEffect(() => {
    generateCaption(tone);
  }, [location.name, headline, subHeadline, brandingText, tone, aiTags]);

  const handleCopy = () => {
    navigator.clipboard.writeText(captionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          3. Generate Instagram Caption
        </h3>
      </div>

      {/* Tone Selectors */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {TONES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTone(t.id);
              generateCaption(t.id);
            }}
            className={`py-2 px-2.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
              tone === t.id
                ? 'bg-purple-600/10 border-purple-500 text-purple-200 font-semibold'
                : 'bg-transparent border-white/5 hover:border-white/10 text-gray-400'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Caption Text Area */}
      <div className="relative">
        <textarea
          rows="6"
          className="input-field text-xs resize-none font-mono pr-10 leading-relaxed"
          value={captionText}
          onChange={(e) => {
            setCaptionText(e.target.value);
            onCaptionChange(e.target.value);
          }}
          placeholder="Generating copy..."
        />
        
        <button
          onClick={handleCopy}
          className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
          title="Copy caption"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Auto-synced with Location and Title
        </span>
        <span>{captionText.length} characters</span>
      </div>
    </div>
  );
}
