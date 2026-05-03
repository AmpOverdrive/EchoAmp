"use client";

import { useMemo, useState } from "react";

function decodeHtmlEntities(text = "") {
  if (typeof window === "undefined") {
    return text
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export default function ExpandableArtistBio({
  text,
  image,
  artistName,
  maxLength = 650,
}: {
  text?: string;
  image?: string;
  artistName?: string;
  maxLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const decoded = useMemo(() => decodeHtmlEntities(text || ""), [text]);

  if (!decoded) return null;

  const shouldCollapse = decoded.length > maxLength;
  const visibleText =
    shouldCollapse && !expanded
      ? decoded.slice(0, maxLength).trim() + "..."
      : decoded;

  return (
    <section className="px-5 pt-8 sm:px-6 lg:px-8">
      <div className="app-detail-panel rounded-3xl p-5">
        <h2 className="app-label mb-4">
          About the Artist
        </h2>

        <div className="flex gap-5">
          {image && (
            <img
              src={image}
              alt={artistName || "Artist"}
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          )}

          <div>
            <p className="app-body max-w-7xl">
              {visibleText}
            </p>

            {shouldCollapse && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-sm font-semibold text-[var(--app-accent)] hover:brightness-110"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
