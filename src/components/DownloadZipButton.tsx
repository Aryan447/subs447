import JSZip from "jszip";
import { Episode, getSubtitles } from "@/lib/api";
import { useState } from "react";

interface DownloadZipButtonProps {
  episodes: Episode[];
  mediaName: string;
  label: string;
  type: "season" | "series";
  seasonNumber?: number;
  selectedLang?: string;
}

export default function DownloadZipButton({ episodes, mediaName, label, type, seasonNumber, selectedLang = "eng" }: DownloadZipButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadZip = async () => {
    setIsDownloading(true);
    setProgress(0);
    const zip = new JSZip();
    
    try {
      const total = episodes.length;
      let completed = 0;

      const folderName = type === "season" 
        ? `${mediaName} S${String(seasonNumber).padStart(2, '0')}`
        : mediaName;
      
      const rootFolder = zip.folder(folderName);

      const fetchSubtitleForEpisode = async (episode: Episode) => {
        try {
          const subs = await getSubtitles(episode.id, "series");
          // Prefer selected language, then English, then first available
          const selectedSub = subs.find(s => s.lang === selectedLang) 
            || subs.find(s => s.lang === "eng") 
            || subs[0];
          
          if (selectedSub && selectedSub.url) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(selectedSub.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch via proxy: ${response.statusText}`);
            const blob = await response.blob();
            
            const fileName = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')} - ${episode.name || 'Episode'}.srt`;
            
            if (type === "series") {
              const seasonFolderName = `Season ${String(episode.season).padStart(2, '0')}`;
              const seasonFolder = rootFolder?.folder(seasonFolderName);
              seasonFolder?.file(fileName, blob);
            } else {
              rootFolder?.file(fileName, blob);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch subtitles for ${episode.id}:`, err);
        } finally {
          completed++;
          setProgress(Math.round((completed / total) * 100));
        }
      };

      // Fetch in small batches to avoid overwhelming or getting blocked
      const batchSize = 5;
      for (let i = 0; i < episodes.length; i += batchSize) {
        const batch = episodes.slice(i, i + batchSize);
        await Promise.all(batch.map(ep => fetchSubtitleForEpisode(ep)));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${folderName} Subtitles.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP creation failed:", error);
      alert("Failed to create ZIP. This might be due to CORS restrictions on subtitle providers.");
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <button
      onClick={downloadZip}
      disabled={isDownloading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gold/30 hover:border-gold bg-gold/5 text-gold text-xs font-black uppercase tracking-widest transition-all ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      {isDownloading ? `Archiving... ${progress}%` : label}
    </button>
  );
}
