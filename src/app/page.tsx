"use client";

import { useState, useMemo } from "react";
import { triggerHaptic } from "@/lib/haptics";
import SearchForm from "@/components/SearchForm";
import MediaCard from "@/components/MediaCard";
import SubtitleList from "@/components/SubtitleList";
import DownloadButton from "@/components/DownloadButton";
import { searchMedia, getSubtitles, getMediaDetails, MediaMetadata, Subtitle } from "@/lib/api";
import Fuse from "fuse.js";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MediaMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isSubsLoading, setIsSubsLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("eng");
  
  // Series specific state
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<string>("");

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setSelectedMedia(null);
    try {
      const data = await searchMedia(query);
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fuzzyResults = useMemo(() => {
    if (!searchQuery || results.length === 0) return results;
    const fuse = new Fuse(results, { keys: ["name", "id"], threshold: 0.4 });
    const fuzzyMatches = fuse.search(searchQuery);
    return fuzzyMatches.length > 0 ? fuzzyMatches.map(m => m.item) : results;
  }, [results, searchQuery]);

  const handleMediaClick = async (media: MediaMetadata) => {
    setIsLoading(true);
    try {
      const details = await getMediaDetails(media.id, media.type);
      if (details) {
        setSelectedMedia(details);
        if (details.type === "series" && details.videos && details.videos.length > 0) {
          // Filter out specials (Season 0) for the initial selection
          const mainSeasons = details.videos.filter(v => v.season > 0);
          const displayVideos = mainSeasons.length > 0 ? mainSeasons : details.videos;
          const firstEp = displayVideos[0];
          
          setSelectedSeason(firstEp.season);
          setSelectedEpisode(firstEp.id);
          fetchSubtitles(firstEp.id, "series");
        } else {
          fetchSubtitles(details.id, "movie");
        }
      }
    } catch (error) {
      console.error("Failed to fetch details:", error);
    } finally {
      setIsLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchSubtitles = async (id: string, type: "movie" | "series") => {
    setIsSubsLoading(true);
    setSubtitles([]);
    try {
      const subs = await getSubtitles(id, type);
      setSubtitles(subs);
    } catch (error) {
      console.error("Failed to fetch subtitles:", error);
    } finally {
      setIsSubsLoading(false);
    }
  };

  const seasons = useMemo(() => {
    if (!selectedMedia?.videos) return [];
    // Filter out Season 0 (Specials) unless that's all there is
    const uniqueS = Array.from(new Set(selectedMedia.videos.map(v => v.season)));
    const mainSeasons = uniqueS.filter(s => s > 0);
    const finalSeasons = mainSeasons.length > 0 ? mainSeasons : uniqueS;
    return finalSeasons.sort((a, b) => a - b);
  }, [selectedMedia]);

  const episodesInSeason = useMemo(() => {
    if (!selectedMedia?.videos) return [];
    return selectedMedia.videos.filter(v => v.season === selectedSeason);
  }, [selectedMedia, selectedSeason]);

  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season);
    const firstEp = selectedMedia?.videos?.find(v => v.season === season);
    if (firstEp) {
      setSelectedEpisode(firstEp.id);
      fetchSubtitles(firstEp.id, "series");
    }
  };

  const handleEpisodeChange = (episodeId: string) => {
    setSelectedEpisode(episodeId);
    fetchSubtitles(episodeId, "series");
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className={`flex flex-col items-center transition-all duration-700 ${results.length > 0 || selectedMedia ? 'mb-16' : 'min-h-[60vh] justify-center'}`}>
        {!selectedMedia && (
          <>
            <h1 className="text-5xl md:text-7xl font-serif font-black mb-6 text-center text-gold-gradient uppercase tracking-tighter">
              SubSearch
            </h1>
            <p className="text-lg text-gold/60 mb-10 text-center max-w-2xl font-light tracking-wide uppercase italic">
              &quot;The Golden Age of Cinema, Reimagined for the Modern Viewer&quot;
            </p>
          </>
        )}
        
        {selectedMedia ? (
          <div className="w-full max-w-5xl flex flex-col md:flex-row gap-10 items-start bg-crimson/30 p-8 rounded-3xl border-2 border-gold/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
            <div className="w-full md:w-80 aspect-[2/3] relative rounded-xl overflow-hidden border-2 border-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              {selectedMedia.poster ? (
                <img src={selectedMedia.poster} alt={selectedMedia.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gold/40 bg-black/40">No Poster</div>
              )}
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start mb-6">
                <button 
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedMedia(null);
                  }}
                  className="text-gold hover:text-gold-light flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  ← Return to Gallery
                </button>
                {selectedMedia.type === "series" && selectedMedia.videos && (
                  <DownloadButton 
                    episodes={selectedMedia.videos} 
                    mediaName={selectedMedia.name} 
                    label="Download Entire Series (All Seasons)" 
                    type="series"
                    selectedLang={selectedLang}
                  />
                )}
              </div>
              <h2 className="text-4xl font-serif font-bold mb-3 text-gold-gradient uppercase tracking-tight">{selectedMedia.name}</h2>
              <div className="flex flex-wrap gap-4 mb-6">
                <span className="px-3 py-1 bg-red-theater text-gold-light text-[10px] font-black uppercase tracking-[0.15em] rounded shadow-inner">
                  {selectedMedia.type}
                </span>
                <span className="px-3 py-1 border border-gold/30 text-gold/60 text-[10px] font-bold uppercase rounded">
                  {selectedMedia.year}
                </span>
                {selectedMedia.imdbRating && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-gold/10 border border-gold/30 text-gold text-[10px] font-black uppercase rounded">
                    <svg className="w-3 h-3 fill-gold" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    {selectedMedia.imdbRating}
                  </span>
                )}
                {selectedMedia.runtime && (
                  <span className="px-3 py-1 border border-gold/30 text-gold/60 text-[10px] font-bold uppercase rounded">
                    {selectedMedia.runtime}
                  </span>
                )}
              </div>

              {selectedMedia.genres && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedMedia.genres.map(genre => (
                    <span key={genre} className="text-[9px] font-bold text-gold/40 uppercase tracking-widest px-2 py-0.5 border border-gold/10 rounded-full">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Season Ratings Graph for Series */}
              {selectedMedia.type === "series" && seasons.length > 1 && (
                <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-gold/10">
                  <h3 className="text-[10px] font-black text-gold/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Season Performance Index
                  </h3>
                  <div className="flex items-end gap-3 h-32 px-2">
                    {seasons.map(s => {
                      const eps = selectedMedia.videos?.filter(v => v.season === s && v.rating) || [];
                      const avg = eps.length > 0 
                        ? eps.reduce((acc, curr) => acc + parseFloat(curr.rating || "0"), 0) / eps.length 
                        : 0;
                      const height = (avg / 10) * 100;
                      return (
                        <div key={s} className="flex-grow flex flex-col items-center gap-2 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-red-theater/40 to-gold/40 rounded-t-sm border-x border-t border-gold/20 transition-all group-hover:from-red-theater group-hover:to-gold cursor-help"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gold text-black text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                              Rating: {avg.toFixed(1)}
                            </div>
                          </div>
                          <span className="text-[8px] font-black text-gold/30 uppercase tracking-tighter">S{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Season & Episode Selector for Series */}
              {selectedMedia.type === "series" && seasons.length > 0 && (
                <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-gold/20 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-[10px] font-black text-gold/40 uppercase tracking-[0.2em]">Season</label>
                      <DownloadButton 
                        episodes={episodesInSeason} 
                        mediaName={selectedMedia.name} 
                        label={`S${selectedSeason} Download`} 
                        type="season"
                        seasonNumber={selectedSeason}
                        selectedLang={selectedLang}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seasons.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            triggerHaptic("light");
                            handleSeasonChange(s);
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${selectedSeason === s ? 'bg-gold text-black border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'bg-transparent text-gold/60 border-gold/20 hover:border-gold/50'}`}
                        >
                          S{s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gold/40 uppercase tracking-[0.2em] mb-3">Episode</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {episodesInSeason.map(ep => (
                        <button
                          key={ep.id}
                          onClick={() => {
                            triggerHaptic("light");
                            handleEpisodeChange(ep.id);
                          }}
                          className={`aspect-square flex items-center justify-center rounded-lg text-[10px] font-bold transition-all border ${selectedEpisode === ep.id ? 'bg-gold text-black border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'bg-transparent text-gold/60 border-gold/20 hover:border-gold/50'}`}
                          title={ep.name}
                        >
                          {ep.episode}
                        </button>
                      ))}
                    </div>
                    {selectedEpisode && (
                      <p className="mt-3 text-gold/40 text-[10px] italic uppercase tracking-wider">
                        Playing: {episodesInSeason.find(e => e.id === selectedEpisode)?.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-gold/50 text-sm leading-relaxed mb-8 italic">
                {selectedMedia.description}
              </p>
              
              <div className="border-t border-gold/20 pt-8">
                <h3 className="text-xl font-serif font-bold mb-6 text-gold uppercase tracking-widest flex items-center gap-3">
                  <span className="h-px flex-grow bg-gold/20"></span>
                  Selected Subtitles
                  <span className="h-px flex-grow bg-gold/20"></span>
                </h3>
                {isSubsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div>
                ) : (
                  <SubtitleList subtitles={subtitles} selectedLang={selectedLang} onLangChange={setSelectedLang} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        )}
      </div>

      {!selectedMedia && fuzzyResults.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-12">
            <div className="h-px flex-grow bg-gold/20"></div>
            <h2 className="text-2xl font-serif font-bold text-gold uppercase tracking-[0.3em]">
              Now Showing
            </h2>
            <div className="h-px flex-grow bg-gold/20"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {fuzzyResults.map((media) => (
              <MediaCard key={media.id} media={media} onClick={handleMediaClick} />
            ))}
          </div>
        </div>
      )}

      {!selectedMedia && fuzzyResults.length === 0 && !isLoading && (
        <>
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-5xl mx-auto">
            {[
              { title: "Grand Premiere", desc: "Instant access to the world's largest subtitle archive.", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "red-theater" },
              { title: "Privacy Reserved", desc: "No accounts, no tracking. Your private viewing experience.", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "gold" },
              { title: "Forever Free", desc: "Admission is always complimentary for every visitor.", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", color: "gold" }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-crimson/10 border border-gold/10 flex flex-col items-center text-center group hover:border-gold/40 transition-all duration-500">
                <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className={`w-8 h-8 text-gold`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={feature.icon}></path>
                  </svg>
                </div>
                <h3 className="text-lg font-serif font-bold mb-3 text-gold uppercase tracking-widest">{feature.title}</h3>
                <p className="text-gold/40 text-xs leading-relaxed uppercase tracking-wide">{feature.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-32 max-w-3xl mx-auto bg-crimson/20 p-10 rounded-[3rem] border border-gold/20 relative shadow-2xl">
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black px-6 py-2 border border-gold/30 rounded-full text-gold text-[10px] font-black uppercase tracking-[0.4em]">
               Instructions
             </div>
            <h2 className="text-2xl font-serif font-bold mb-10 text-center text-gold uppercase tracking-[0.2em]">The Playbill</h2>
            <div className="space-y-8">
              {[
                "Consult the archives for your desired feature film.",
                "Select your entry from our curated gallery.",
                "Acquire your translated scripts in the language of choice."
              ].map((step, i) => (
                <div key={i} className="flex gap-6 items-center group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center font-serif font-bold text-gold group-hover:bg-gold group-hover:text-black transition-all">{i + 1}</div>
                  <p className="text-gold/60 text-sm uppercase tracking-widest font-light">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
