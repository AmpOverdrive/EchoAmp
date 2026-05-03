const API_KEY = "b4b04b86cb6468d6ffefecdeaa0d7727";

export async function getArtistStats(name) {
  if (!name) return null;

  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
        name
      )}&api_key=${API_KEY}&format=json`
    );

    if (!res.ok) {
      console.error("Last.fm API error:", res.status);
      return [];
    }

    const textData = await res.text();

    if (!textData) {
      console.warn("Last.fm returned empty response");
      return [];
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.error("Invalid JSON from Last.fm:", textData);
      return [];
    }
    const artist = data?.artist;

    if (!artist) return null;

    return {
      name: artist.name,
      listeners: artist.stats?.listeners || 0,
      playcount: artist.stats?.playcount || 0,
      bio: artist.bio?.summary || "",
      image: (() => {
        const image =
          artist.image?.find((i) => i.size === "extralarge")?.["#text"] ||
          artist.image?.find((i) => i.size === "large")?.["#text"] ||
          null;

        if (!image) return null;

        // Last.fm default missing-artist image
        if (image.includes("2a96cbd8b46e442fc41c2b86b821562f")) return null;

        return image;
      })(),
    };
  } catch (error) {
    console.error("Last.fm artist stats failed:", error);
    return null;
  }
}

export async function getTrackStats(artist, track) {
  if (!artist || !track) return null;

  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(
        artist
      )}&track=${encodeURIComponent(
        track
      )}&api_key=${API_KEY}&format=json`
    );

    if (!res.ok) {
      console.error("Last.fm API error:", res.status);
      return [];
    }

    const textData = await res.text();

    if (!textData) {
      console.warn("Last.fm returned empty response");
      return [];
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.error("Invalid JSON from Last.fm:", textData);
      return [];
    }
    const t = data?.track;

    if (!t) return null;

    return {
      name: t.name,
      listeners: t.listeners || 0,
      playcount: t.playcount || 0,
      url: t.url || "",
    };
  } catch (error) {
    console.error("Last.fm track stats failed:", error);
    return null;
  }
}

export async function getSimilarArtists(name) {
  if (!name) return [];

  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(
        name
      )}&api_key=${API_KEY}&format=json`
    );

    if (!res.ok) {
      console.error("Last.fm API error:", res.status);
      return [];
    }

    const textData = await res.text();

    if (!textData) {
      console.warn("Last.fm returned empty response");
      return [];
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.error("Invalid JSON from Last.fm:", textData);
      return [];
    }
    const artists = data?.similarartists?.artist || [];

    return artists.map((a) => ({
      name: a.name,
      image:
        a.image?.find((i) => i.size === "large")?.["#text"] ||
        a.image?.[2]?.["#text"] ||
        "",
    }));
  } catch (error) {
    console.error("Last.fm similar artists failed:", error);
    return [];
  }
}
