"use client";

import JSZip from "jszip";
import { Episode, getSubtitles } from "@/lib/api";
import { useState, useEffect, useRef } from "react";

interface DownloadButtonProps {
  episodes: Episode[];
  mediaName: string;
  label: string;
  type: "season" | "series";
  seasonNumber?: number;
  selectedLang?: string;
}

export default function DownloadButton({ 
  episodes, 
  mediaName, 
  label, 
  type, 
  seasonNumber, 
  selectedLang = "eng" 
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFolderSupported, setIsFolderSupported] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFolderSupported(typeof window !== "undefined" && "showDirectoryPicker" in window);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const downloadZip = async () => {
    setIsOpen(false);
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

  const downloadMultipleFiles = async () => {
    setIsOpen(false);
    setIsDownloading(true);
    setProgress(0);

    try {
      const total = episodes.length;
      let completed = 0;

      for (const episode of episodes) {
        try {
          const subs = await getSubtitles(episode.id, "series");
          const selectedSub = subs.find(s => s.lang === selectedLang) 
            || subs.find(s => s.lang === "eng") 
            || subs[0];
          
          if (selectedSub && selectedSub.url) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(selectedSub.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch via proxy: ${response.statusText}`);
            const blob = await response.blob();
            
            const fileName = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')} - ${episode.name || 'Episode'}.srt`;
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        } catch (err) {
          console.error(`Failed to download subtitle for ${episode.id}:`, err);
        }
        completed++;
        setProgress(Math.round((completed / total) * 100));
        
        // Wait 600ms between downloads to avoid browser throttling or blocking multi-downloads
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      setTimeout(() => {
        alert("Successfully downloaded all subtitles to your Downloads folder!");
      }, 100);
    } catch (error) {
      console.error("Multiple file downloads failed:", error);
      alert("Failed to complete multiple file downloads.");
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const downloadToFolder = async () => {
    setIsOpen(false);
    if (!isFolderSupported) {
      alert("Your browser does not support writing files directly to a folder. Please use a desktop version of Chrome, Edge, Brave, or Opera.");
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      // Prompt user to select a directory
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite"
      });

      const total = episodes.length;
      let completed = 0;

      const folderName = type === "season" 
        ? `${mediaName} S${String(seasonNumber).padStart(2, '0')}`
        : mediaName;

      // Create a subfolder inside the selected directory to keep files organized
      const rootFolderHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });

      const fetchAndWriteSubtitle = async (episode: Episode) => {
        try {
          const subs = await getSubtitles(episode.id, "series");
          const selectedSub = subs.find(s => s.lang === selectedLang) 
            || subs.find(s => s.lang === "eng") 
            || subs[0];
          
          if (selectedSub && selectedSub.url) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(selectedSub.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch via proxy: ${response.statusText}`);
            const blob = await response.blob();
            
            const fileName = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')} - ${episode.name || 'Episode'}.srt`;
            
            let targetFolderHandle = rootFolderHandle;
            if (type === "series") {
              const seasonFolderName = `Season ${String(episode.season).padStart(2, '0')}`;
              targetFolderHandle = await rootFolderHandle.getDirectoryHandle(seasonFolderName, { create: true });
            }

            const fileHandle = await targetFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          }
        } catch (err) {
          console.error(`Failed to download subtitle for ${episode.id}:`, err);
        } finally {
          completed++;
          setProgress(Math.round((completed / total) * 100));
        }
      };

      const batchSize = 5;
      for (let i = 0; i < episodes.length; i += batchSize) {
        const batch = episodes.slice(i, i + batchSize);
        await Promise.all(batch.map(ep => fetchAndWriteSubtitle(ep)));
      }

      setTimeout(() => {
        alert(`Successfully downloaded all subtitles to the folder "${folderName}"!`);
      }, 100);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("User cancelled folder selection");
      } else {
        console.error("Folder download failed:", error);
        alert(`Failed to write to folder: ${error.message || error}`);
      }
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gold/30 hover:border-gold bg-gold/5 text-gold text-xs font-black uppercase tracking-widest transition-all select-none ${
          isDownloading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        <span>
          {isDownloading ? `Downloading... ${progress}%` : label}
        </span>
        {!isDownloading && (
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
          </svg>
        )}
      </button>

      {/* Progress Bar overlay when downloading */}
      {isDownloading && (
        <div className="absolute bottom-0 left-0 h-1 bg-gold rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border-2 border-gold/30 bg-black/95 backdrop-blur-md shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-gold/10">
          <div className="py-1">
            <button
              onClick={downloadZip}
              className="flex items-center w-full px-4 py-3 text-xs text-gold/80 hover:text-gold-light hover:bg-gold/10 transition-all font-black uppercase tracking-wider text-left gap-3"
            >
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
              </svg>
              <div className="flex flex-col">
                <span>Download as ZIP</span>
                <span className="text-[9px] font-normal text-gold/40 normal-case mt-0.5">Recommended for Mobile • Extracts as a folder</span>
              </div>
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={downloadMultipleFiles}
              className="flex items-center w-full px-4 py-3 text-xs text-gold/80 hover:text-gold-light hover:bg-gold/10 transition-all font-black uppercase tracking-wider text-left gap-3"
            >
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <div className="flex flex-col">
                <span>Download as Individual Files</span>
                <span className="text-[9px] font-normal text-gold/40 normal-case mt-0.5">Downloads directly to phone&apos;s Downloads folder</span>
              </div>
            </button>
          </div>
          
          <div className="py-1">
            <button
              onClick={downloadToFolder}
              className={`flex items-center w-full px-4 py-3 text-xs text-left gap-3 transition-all font-black uppercase tracking-wider ${
                isFolderSupported 
                  ? "text-gold/80 hover:text-gold-light hover:bg-gold/10" 
                  : "text-gold/30 cursor-not-allowed opacity-50"
              }`}
            >
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              <div className="flex flex-col">
                <span>Save directly to a Local Folder</span>
                <span className="text-[9px] font-normal text-gold/40 normal-case mt-0.5">
                  {isFolderSupported 
                    ? "Choose any folder on your computer" 
                    : "Chrome/Edge/Brave Desktop only"}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
