# EchoAmp 🎧

**EchoAmp** is a modern macOS music client for Navidrome, built to deliver a fast, immersive, and intelligent listening experience for self-hosted music libraries.

> Your music library, amplified.

---

## 🚀 Overview

EchoAmp combines the flexibility of Navidrome with a modern desktop experience. It focuses on performance, clean design, and features that make rediscovering your music effortless.

Designed as a full macOS application, EchoAmp goes beyond a basic web UI to provide a native-feeling player with advanced playback, discovery, and library management.

---

## ✨ Features

### 🎧 Playback Experience

* Full **Now Playing view** with artwork and metadata
* **Queue management** with sidebar controls
* **Mini player + fullscreen player**
* Smooth playback with persistent state

### 📡 Channels (Live Listening)

* Continuous, radio-style playback
* Genre- and mood-based streams
* Live-style playback with visual feedback
* Seamless transitions between tracks
* Designed for passive listening and discovery

### 🔎 Library & Discovery

* Browse **albums, artists, tracks, genres, moods**
* **Global search** across your library
* Discovery sections:

  * Mixes
  * Recently added
  * Most played
  * Favorites

### ❤️ Personalization

* Favorites and listening behavior tracking
* Recently played tracking

### 🌐 Navidrome Integration

* Connects directly to your **Navidrome server**
* Syncs library, playlists, and metadata

### ⚡ Performance & UX

* Fast navigation and rendering
* Clean, modern UI built with React + Next.js
* Optimized for large music libraries

### 🖥️ Desktop App

* Native macOS experience via Electron
* Local playback with desktop-level controls

---

## 🧱 Tech Stack

* **Next.js / React** — UI and app structure
* **Electron** — macOS desktop packaging
* **Navidrome API** — music library backend
* Custom state management for:

  * Playback
  * Queue
  * User behavior

---

## 🛠️ Getting Started

### Clone the repository

```bash
git clone https://github.com/AmpOverdrive/EchoAmp.git
cd EchoAmp
```

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env.local` file:

```env
NAVIDROME_URL=http://localhost:4533
NAVIDROME_USERNAME=your_username
NAVIDROME_PASSWORD=your_password
LASTFM_API_KEY=your_api_key
LASTFM_API_SECRET=your_api_secret
```

> ⚠️ Never commit `.env.local` — it should remain local only.

### Run in development

```bash
npm run dev
```

---

## 📦 Building the macOS App

```bash
npm run build
```

*(Electron packaging configuration may vary depending on your setup.)*

---

## 📁 Project Structure

```text
app/                → Next.js app routes (albums, artists, now-playing, etc.)
components/         → UI + player components
components/player/  → Playback system (MiniPlayer, Fullscreen, Queue)
lib/                → Core logic (Navidrome client, stores, utilities)
electron/           → Desktop app entry + configuration
public/             → Static assets
```

---

## 🚧 Project Status

EchoAmp is actively in development.

Core functionality is in place, with ongoing work focused on:

* Discovery features
* UI polish
* Performance improvements
* Desktop experience enhancements

---

## 🗺️ Roadmap

* [ ] Smart mixes (genre, mood, similarity)
* [ ] Advanced recommendations
* [ ] Offline support
* [ ] Enhanced playlist management
* [ ] Channels expansion (custom stations, user-defined streams)
* [ ] Visual polish and animations
* [ ] Performance tuning for large libraries

---

## 🤘 Philosophy

EchoAmp is built around a simple idea:

> Your music collection deserves a modern, fast, and beautiful experience.

Instead of relying on streaming platforms, EchoAmp empowers you to enjoy your **own library**—with the same level of polish and usability expected from modern apps.

---

## 📄 License

MIT
