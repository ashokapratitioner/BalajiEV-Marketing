import React, { useEffect, useState } from 'react';
import { X, CheckCircle, ExternalLink, Copy, Check, Download, AlertCircle, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PublishModal({ isOpen, onClose, postData, captionText }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Trigger automated actions on open
  useEffect(() => {
    if (isOpen && postData) {
      // 1. Copy caption automatically
      navigator.clipboard.writeText(captionText)
        .then(() => setCopied(true))
        .catch(err => console.error('Failed to auto-copy caption:', err));

      // 2. Download image automatically
      triggerDownload();

      // 3. Trigger initial celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      setCopied(false);
      setDownloaded(false);
    }
  }, [isOpen, postData, captionText]);

  if (!isOpen || !postData) return null;

  const triggerDownload = () => {
    try {
      const link = document.createElement('a');
      const cleanLocName = (postData.brandingText || 'post').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `instagram_post_${cleanLocName}.png`;
      link.href = postData.imageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloaded(true);

      // Soft confetti burst for download action
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(captionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-[860px] glass-panel bg-slate-900/90 border-white/10 p-6 md:p-8 flex flex-col md:flex-row gap-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Mock Instagram Feed Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-gray-400 tracking-wider">
            INSTAGRAM FEED MOCKUP
          </h4>
          
          {/* Instagram Post card */}
          <div className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden max-w-[380px] mx-auto shadow-2xl">
            {/* Header */}
            <div className="p-3 flex items-center gap-2.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] font-bold text-white">
                  EV
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-200">
                  {postData.brandingText ? postData.brandingText.toLowerCase() : '@goelectric_balajiev'}
                </span>
                <span className="text-[9px] text-gray-400">
                  Balaji EVs, Bihar, India
                </span>
              </div>
            </div>

            {/* Main Image */}
            <div className="aspect-square w-full bg-slate-900">
              <img
                src={postData.imageUrl}
                alt="Instagram composition mockup"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Interaction Row */}
            <div className="p-3 flex items-center justify-between text-gray-200">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 hover:text-red-500 cursor-pointer transition-colors" />
                <MessageCircle className="w-5 h-5 cursor-pointer" />
                <Send className="w-5 h-5 cursor-pointer" />
              </div>
              <Bookmark className="w-5 h-5 cursor-pointer" />
            </div>

            {/* Caption Section */}
            <div className="px-3 pb-3 text-xs leading-normal">
              <div className="font-bold text-gray-200 mb-1">
                {postData.brandingText ? postData.brandingText.toLowerCase() : 'yourbrand'}
              </div>
              <p className="text-gray-300 font-mono whitespace-pre-line max-h-[80px] overflow-hidden text-ellipsis text-[10px]">
                {captionText}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Actions Panel */}
        <div className="flex-1 flex flex-col gap-6 justify-center">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-green-400 font-semibold text-lg">
              <CheckCircle className="w-6 h-6" />
              Post Assets Prepared!
            </div>
            <p className="text-sm text-gray-400">
              We have compiled your promotional graphic and copied the optimized caption. Follow the simple steps below to publish on Instagram.
            </p>
          </div>

          <hr className="border-white/5" />

          {/* Action List */}
          <div className="flex flex-col gap-4">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                downloaded ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {downloaded ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-gray-200">Download High-Res Post</h5>
                <p className="text-xs text-gray-400 mb-2">
                  The image file is saved directly to your Downloads folder.
                </p>
                <button
                  onClick={triggerDownload}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Again
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {copied ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-gray-200">Caption Copied to Clipboard</h5>
                <p className="text-xs text-gray-400 mb-2">
                  Ready to paste as the post caption on Instagram.
                </p>
                <button
                  onClick={handleCopy}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Caption
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-gray-200">Publish to Your Profiles</h5>
                <p className="text-xs text-gray-400 mb-3">
                  Upload to Instagram Creator Studio, or open your EV profile and Google Maps location directly.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                  <a
                    href="https://create.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-2 px-3.5 text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    🎬 Creator Studio
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://www.instagram.com/goelectric_balajiev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-2 px-3.5 text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    📸 @goelectric_balajiev
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://maps.app.goo.gl/wqHeuX86HnCK6TLC6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-2 px-3.5 text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    📍 Balaji EVs on Maps
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-white/5">
            <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Simply drop the image on Instagram, paste (Ctrl+V) the caption, and you are ready to publish!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
