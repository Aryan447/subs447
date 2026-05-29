import { useMemo } from "react";
import { Subtitle } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";

interface SubtitleListProps {
  subtitles: Subtitle[];
  selectedLang: string;
  onLangChange: (lang: string) => void;
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

export default function SubtitleList({ subtitles, selectedLang, onLangChange }: SubtitleListProps) {
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
    if (selectedLang === "all") return subtitles;
    return subtitles.filter((s) => s.lang === selectedLang);
  }, [subtitles, selectedLang]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 py-4 border-b border-gold/20 sticky top-0 bg-black/90 backdrop-blur-md z-10 -mx-6 px-6 no-scrollbar overflow-x-auto">
        <button
          onClick={() => {
            triggerHaptic("light");
            onLangChange("all");
          }}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
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
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
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
              {subs.map((sub) => (
                <a
                  key={sub.id}
                  href={sub.url}
                  onClick={() => triggerHaptic("medium")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-5 rounded-2xl bg-black/40 border-2 border-gold/10 hover:border-gold/50 hover:bg-crimson/10 transition-all group shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/5 flex items-center justify-center border border-gold/20 group-hover:bg-gold/10 transition-colors">
                      <svg className="w-5 h-5 text-gold/40 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-serif font-bold text-gold/80 group-hover:text-gold transition-colors uppercase tracking-widest">
                        Script v{sub.id.substring(0, 5)}
                      </p>
                      <p className="text-[8px] text-gold/30 uppercase tracking-[0.2em] mt-1 font-black">
                        {sub.SubEncoding} ARCHIVE
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center group-hover:bg-gold group-hover:border-gold transition-all shadow-lg">
                    <svg className="w-5 h-5 text-gold group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
