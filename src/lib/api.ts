const CINEMETA_URL = "https://v3-cinemeta.strem.io";
const OPENSUBTITLES_URL = "https://opensubtitles-v3.strem.io";

export interface MediaMetadata {
  id: string;
  name: string;
  poster?: string;
  year?: string;
  type: "movie" | "series";
  description?: string;
  videos?: Episode[];
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
}

export interface Episode {
  id: string;
  name: string;
  season: number;
  episode: number;
  released: string;
  rating?: string;
}

export interface Subtitle {
  id: string;
  url: string;
  lang: string;
  SubEncoding: string;
}

export async function searchMedia(query: string): Promise<MediaMetadata[]> {
  try {
    const movieRes = await fetch(`${CINEMETA_URL}/catalog/movie/top/search=${encodeURIComponent(query)}.json`);
    const movieData = await movieRes.json();
    
    const seriesRes = await fetch(`${CINEMETA_URL}/catalog/series/top/search=${encodeURIComponent(query)}.json`);
    const seriesData = await seriesRes.json();
    
    const results: MediaMetadata[] = [];
    
    if (movieData.metas) {
      results.push(...movieData.metas.map((m: any) => ({
        id: m.imdb_id || m.id,
        name: m.name,
        poster: m.poster,
        year: m.year,
        type: "movie",
        description: m.description,
        imdbRating: m.imdbRating
      })));
    }
    
    if (seriesData.metas) {
      results.push(...seriesData.metas.map((m: any) => ({
        id: m.imdb_id || m.id,
        name: m.name,
        poster: m.poster,
        year: m.year,
        type: "series",
        description: m.description,
        imdbRating: m.imdbRating
      })));
    }
    
    return results;
  } catch (error) {
    console.error("Error searching media:", error);
    return [];
  }
}

export async function getMediaDetails(id: string, type: "movie" | "series"): Promise<MediaMetadata | null> {
  try {
    const res = await fetch(`${CINEMETA_URL}/meta/${type}/${id}.json`);
    const data = await res.json();
    if (!data.meta) return null;
    
    return {
      id: data.meta.imdb_id || data.meta.id,
      name: data.meta.name,
      poster: data.meta.poster,
      year: data.meta.year,
      type: data.meta.type,
      description: data.meta.description,
      videos: data.meta.videos,
      imdbRating: data.meta.imdbRating,
      genres: data.meta.genres,
      runtime: data.meta.runtime
    };
  } catch (error) {
    console.error("Error getting media details:", error);
    return null;
  }
}

export async function getSubtitles(id: string, type: "movie" | "series"): Promise<Subtitle[]> {
  try {
    const res = await fetch(`${OPENSUBTITLES_URL}/subtitles/${type}/${id}.json`);
    const data = await res.json();
    return data.subtitles || [];
  } catch (error) {
    console.error("Error getting subtitles:", error);
    return [];
  }
}
