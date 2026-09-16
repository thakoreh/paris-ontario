"use client";

import React, { useEffect, useRef, useState } from "react";

export type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const skipSearch = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (skipSearch.current) {
      skipSearch.current = false;
      setSuggestions([]);
      return;
    }
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/address?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const payload = (await response.json()) as {
          suggestions?: AddressSuggestion[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Address search failed.");
        setSuggestions(payload.suggestions ?? []);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setSuggestions([]);
        setError(reason instanceof Error ? reason.message : "Address search failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div className="address-autocomplete">
      <label htmlFor="home-address-search">Address or street</label>
      <input
        id="home-address-search"
        aria-label="Search home address"
        autoComplete="street-address"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 10 Grand River Street North"
        required
      />
      <p className="address-privacy">
        Typed searches are sent to Photon (Komoot), a public geocoder using OpenStreetMap.
        Suggestions may identify a street rather than a house. Check the pin before saving.
      </p>
      {loading && <small className="address-status">Searching…</small>}
      {error && (
        <small className="error" role="alert">
          {error} You can continue with a manually typed address.
        </small>
      )}
      {suggestions.length > 0 && (
        <ul className="address-suggestions" role="listbox" aria-label="Address suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  skipSearch.current = true;
                  onSelect(suggestion);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
