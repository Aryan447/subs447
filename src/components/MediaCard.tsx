import { MediaMetadata } from "@/lib/api";

interface MediaCardProps {
  media: MediaMetadata;
  onClick: (media: MediaMetadata) => void;
}

export default function MediaCard({ media, onClick }: MediaCardProps) {
  return (
    <div 
      onClick={() => onClick(media)}
      className="group cursor-pointer theater-card rounded-xl overflow-hidden transition-all hover:scale-[1.05]"
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-black/40">
        {media.poster ? (
          <img 
            src={media.poster} 
            alt={media.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gold/20 font-serif uppercase tracking-widest text-[10px]">
            Archive Missing
          </div>
        )}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-2 right-2 bg-red-theater/80 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-gold-light border border-gold/20 shadow-lg">
          {media.type}
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-transparent to-crimson/20">
        <h3 className="font-serif font-bold text-sm line-clamp-1 text-gold group-hover:text-gold-light transition-colors uppercase tracking-tight">
          {media.name}
        </h3>
        <div className="flex justify-between items-center mt-1">
          <p className="text-gold/40 text-[10px] uppercase tracking-tighter">
            {media.year || "N/A"}
          </p>
          {media.imdbRating && (
            <div className="flex items-center gap-1 text-[10px] text-gold font-bold">
              <svg className="w-2.5 h-2.5 fill-gold" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              {media.imdbRating}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
