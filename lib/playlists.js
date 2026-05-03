"use client";

const KEY = "navidrome_playlists";

export function getPlaylists() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function savePlaylists(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function createPlaylist(name) {
  const lists = getPlaylists();
  const newList = {
    id: Date.now(),
    name,
    tracks: [],
  };

  lists.push(newList);
  savePlaylists(lists);

  return newList;
}

export function addToPlaylist(playlistId, track) {
  const lists = getPlaylists();

  const updated = lists.map((p) => {
    if (p.id === playlistId) {
      const exists = p.tracks.find((t) => t.id === track.id);
      if (!exists) {
        p.tracks.push(track);
      }
    }
    return p;
  });

  savePlaylists(updated);
}
