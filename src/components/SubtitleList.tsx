"use client";

import { useMemo, useState } from "react";
import { Subtitle } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";

interface SubtitleListProps {
  subtitles: Subtitle[];
  selectedLang: string;
  onLangChange: (lang: string) => void;
}

interface SubtitleLine {
  index: string;
  time: string;
  text: string;
}

const LANGUAGE_NAMES: { [key: string]: string } = {
  eng: "English",
  spa: "Spanish",
  fre: "French",
  ger: "German",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  chi: "Chinese",
  jpn: "Japanese",
  kor: "Korean",
  ara: "Arabic",
  hin: "Hindi",
  tur: "Turkish",
  dut: "Dutch",
  pol: "Polish",
  vie: "Vietnamese",
  tha: "Thai",
  swe: "Swedish",
  dan: "Danish",
  nor: "Norwegian",
  fin: "Finnish",
  ell: "Greek",
  ind: "Indonesian",
  msa: "Malay",
  hrv: "Croatian",
  srp: "Serbian",
  cze: "Czech",
  hun: "Hungarian",
  rum: "Romanian",
  bul: "Bulgarian",
  ukr: "Ukrainian",
  heb: "Hebrew",
  pob: "Portuguese (Brazil)",
};

function getSubtitleFileName(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split("/");
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.toLowerCase().endsWith(".srt")) {
      return lastPart;
    }
    return lastPart || "Subtitle File";
  } catch (e) {
    return "Subtitle File";
  }
}

function getReleaseBadges(fileName: string) {
  const name = fileName.toLowerCase();
  const badges: { text: string; color: string }[] = [];
  if (name.includes("bluray") || name.includes("brrip") || name.includes("bdrip") || name.includes("1080p") || name.includes("720p") || name.includes("yify")) {
    badges.push({ text: "BluRay/HD", color: "bg-gold/10 text-gold border-gold/30" });
  } 
  if (name.includes("web-dl") || name.includes("webrip") || name.includes("web.dl") || name.includes("hdtv")) {
    badges.push({ text: "WEB-DL", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" });
  }
  if (name.includes("sdh") || name.includes("hearing") || name.includes("hi")) {
    badges.push({ text: "SDH", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" });
  }
  return badges;
}

function parseSubtitleText(text: string): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    const parts = block.trim().split("\n");
    if (parts.length >= 2) {
      const index = parts[0].trim();
      const isSrtIndex = /^\d+$/.test(index);
      let timeIndex = 1;
      let textStart = 2;

      if (!isSrtIndex) {
        if (parts[0].includes("-->")) {
          timeIndex = 0;
          textStart = 1;
        } else {
          continue;
        }
      }

      const time = parts[timeIndex]?.trim() || "";
      if (time.includes("-->")) {
        const text = parts.slice(textStart).join(" ").replace(/<[^>]*>/g, "");
        if (text) {
          lines.push({
            index: isSrtIndex ? index : (lines.length + 1).toString(),
            time,
            text
          });
        }
      }
    }
    if (lines.length >= 25) break;
  }
  return lines;
}

export default function SubtitleList({ subtitles, selectedLang, onLangChange }: SubtitleListProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [previewSub, setPreviewSub] = useState<Subtitle | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLines, setPreviewLines] = useState<SubtitleLine[]>([]);

  const languages = useMemo(() => {
    const uniqueLangs = Array.from(new Set(subtitles.map((s) => s.lang)));
    const priority = ["eng", "hin"];
    
    return uniqueLangs.sort((a, b) => {
      const indexA = priority.indexOf(a);
      const indexB = priority.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      const nameA = LANGUAGE_NAMES[a] || a;
      const nameB = LANGUAGE_NAMES[b] || b;
      return nameA.localeCompare(nameB);
    });
  }, [subtitles]);

  const filteredSubtitles = useMemo(() => {
    let result = subtitles;
    if (selectedLang !== "all") {
      result = result.filter((s) => s.lang === selectedLang);
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter((s) => {
        const fileName = getSubtitleFileName(s.url).toLowerCase();
        const langName = (LANGUAGE_NAMES[s.lang] || s.lang).toLowerCase();
        const encoding = s.SubEncoding.toLowerCase();
        return fileName.includes(q) || langName.includes(q) || encoding.includes(q);
      });
    }
    return result;
  }, [subtitles, selectedLang, filterQuery]);

  if (subtitles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gold/40 italic font-serif">The archives are silent for this title.</p>
      </div>
    );
  }

  const grouped = filteredSubtitles.reduce((acc, sub) => {
    if (!acc[sub.lang]) acc[sub.lang] = [];
    acc[sub.lang].push(sub);
    return acc;
  }, {} as { [key: string]: Subtitle[] });

  const sortedGroupedEntries = Object.entries(grouped).sort(([langA], [langB]) => {
    const priority = ["eng", "hin"];
    const indexA = priority.indexOf(langA);
    const indexB = priority.indexOf(langB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    const nameA = LANGUAGE_NAMES[langA] || langA;
    const nameB = LANGUAGE_NAMES[langB] || langB;
    return nameA.localeCompare(nameB);
  });

  const handlePreviewClick = async (sub: Subtitle) => {
    triggerHaptic("medium");
    setPreviewSub(sub);
    setPreviewLoading(true);
    setPreviewLines([]);

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(sub.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Network error fetching preview");
      const text = await response.text();
      const lines = parseSubtitleText(text);
      setPreviewLines(lines);
    } catch (error) {
      console.error("Preview failed:", error);
      setPreviewLines([
        {
          index: "!",
          time: "00:00:00,000",
          text: "Preview unavailable. The file may be in an unsupported format, but you can still download it directly."
        }
      ]);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtitle Filter Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gold/40 group-focus-within:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter archives (e.g. BluRay, yify, FGT, SDH)..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-crimson/5 border-2 border-gold/15 text-gold focus:outline-none focus:border-gold/40 focus:ring-0 text-xs transition-all placeholder:text-gold/20 tracking-wider shadow-inner"
        />
      </div>

      <div className="flex flex-wrap gap-2 py-4 border-b border-gold/20 sticky top-0 bg-black/90 backdrop-blur-md z-10 -mx-6 px-6 no-scrollbar overflow-x-auto">
        <button
          onClick={() => {
            triggerHaptic("light");
            onLangChange("all");
          }}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            selectedLang === "all"
              ? "bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)]"
              : "bg-crimson/30 text-gold/40 border border-gold/20 hover:border-gold/50 hover:text-gold"
          }`}
        >
          All
        </button>
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => {
              triggerHaptic("light");
              onLangChange(lang);
            }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              selectedLang === lang
                ? "bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                : (lang === "eng" || lang === "hin" 
                    ? "bg-red-theater/40 text-gold border border-gold/40 hover:bg-red-theater/60" 
                    : "bg-crimson/30 text-gold/40 border border-gold/20 hover:border-gold/50 hover:text-gold")
            }`}
          >
            {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-10 pt-6">
        {sortedGroupedEntries.map(([lang, subs]) => (
          <div key={lang}>
            <h3 className="text-xs font-serif font-black mb-6 flex items-center gap-4 text-gold uppercase tracking-[0.3em]">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${lang === "eng" || lang === "hin" ? "border-gold bg-gold/10 text-gold" : "border-gold/20 text-gold/40"}`}>
                {lang.substring(0, 2)}
              </span>
              {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
              <div className="h-px flex-grow bg-gold/10"></div>
              <span className="text-[10px] font-light text-gold/30 italic">
                {subs.length} Edition{subs.length > 1 ? "s" : ""}
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subs.map((sub) => {
                const fileName = getSubtitleFileName(sub.url);
                const badges = getReleaseBadges(fileName);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-5 rounded-2xl bg-black/40 border-2 border-gold/10 hover:border-gold/30 hover:bg-crimson/10 transition-all group shadow-xl gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-grow">
                      <div className="w-10 h-10 rounded-xl bg-gold/5 flex items-center justify-center border border-gold/20 group-hover:bg-gold/10 transition-colors flex-shrink-0">
                        <svg className="w-5 h-5 text-gold/40 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p 
                          className="text-[10px] font-mono font-bold text-gold/80 group-hover:text-gold transition-colors truncate block select-all" 
                          title={fileName}
                        >
                          {fileName}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="px-1.5 py-0.5 bg-black/40 text-[7px] text-gold/40 border border-gold/10 font-bold uppercase tracking-wider rounded">
                            {sub.SubEncoding}
                          </span>
                          {badges.map((badge, idx) => (
                            <span key={idx} className={`px-1.5 py-0.5 border rounded text-[7px] font-black uppercase tracking-wider ${badge.color}`}>
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Preview Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handlePreviewClick(sub);
                        }}
                        className="w-10 h-10 rounded-full border border-gold/20 hover:bg-gold/10 hover:border-gold/50 flex items-center justify-center transition-all shadow-lg cursor-pointer"
                        title="Preview Subtitle Dialogue"
                      >
                        <svg className="w-4.5 h-4.5 text-gold/60 hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      </button>
                      {/* Direct Download Button */}
                      <a
                        href={sub.url}
                        onClick={() => triggerHaptic("medium")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center hover:bg-gold hover:border-gold transition-all shadow-lg cursor-pointer"
                        title="Download Subtitle File"
                      >
                        <svg className="w-5 h-5 text-gold group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Subtitle Dialogue Preview Modal */}
      {previewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-2xl bg-black/95 border-2 border-gold/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col max-h-[80vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
            
            {/* Header */}
            <div className="p-6 border-b border-gold/20 flex justify-between items-center bg-crimson/10 gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-serif font-black text-gold-gradient uppercase tracking-widest">Dialogue Preview</h4>
                <p className="text-[9px] font-mono text-gold/40 truncate max-w-[400px] mt-1 select-all" title={getSubtitleFileName(previewSub.url)}>
                  {getSubtitleFileName(previewSub.url)}
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setPreviewSub(null);
                }}
                className="text-gold/40 hover:text-gold text-xs font-black uppercase tracking-widest border border-gold/20 hover:border-gold/50 px-3 py-1 rounded-lg transition-all cursor-pointer flex-shrink-0"
              >
                Close
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-grow space-y-4 no-scrollbar">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
                  <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest animate-pulse">Decrypting script...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewLines.map((line) => (
                    <div key={line.index} className="p-4 rounded-xl bg-crimson/5 border border-gold/5 hover:border-gold/20 transition-all flex gap-4 items-start">
                      <span className="text-[8px] font-black text-gold/30 font-mono bg-gold/5 px-2 py-0.5 border border-gold/10 rounded flex-shrink-0 mt-0.5">
                        #{line.index}
                      </span>
                      <div className="flex-grow space-y-1 min-w-0">
                        <span className="text-[8px] font-mono text-gold/40 tracking-wider block">
                          {line.time.replace(/,/g, ".")}
                        </span>
                        <p className="text-xs text-gold/80 leading-relaxed font-serif uppercase tracking-wide break-words">
                          {line.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {previewLines.length === 0 && (
                    <p className="text-center text-xs text-gold/40 italic py-10 font-serif">No subtitle lines could be parsed from this file.</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gold/10 bg-black/60 flex justify-between items-center text-[9px] font-bold text-gold/30 uppercase tracking-wider">
              <span>Showing first 25 lines</span>
              <span>Encoding: {previewSub.SubEncoding}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
