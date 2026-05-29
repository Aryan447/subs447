"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import debounce from "lodash.debounce";
import { triggerHaptic } from "@/lib/haptics";

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const initialLoad = useRef(true);

  const debouncedSearch = useCallback(
    debounce((nextValue: string) => {
      if (nextValue.trim().length >= 2) {
        onSearch(nextValue.trim());
      }
    }, 500),
    [onSearch]
  );

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("medium");
    debouncedSearch.cancel();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gold/40 group-focus-within:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Consult the archives (Search titles...)"
          className="w-full pl-14 pr-14 py-5 rounded-2xl bg-crimson/10 border-2 border-gold/20 text-gold focus:outline-none focus:border-gold/50 focus:ring-0 text-lg transition-all font-serif placeholder:text-gold/20 placeholder:italic shadow-2xl"
        />
        {isLoading && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-6 w-6 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
    </form>
  );
}
