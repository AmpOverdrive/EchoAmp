import GlobalSearchBar from "@/components/GlobalSearchBar";
import "./globals.css";
import AppearanceProvider from "@/components/AppearanceProvider";
import Sidebar from "@/components/Sidebar";
import NowPlayingRedirect from "@/components/player/NowPlayingRedirect";
import PlayerProvider from "@/components/player/PlayerProvider";
import ThemeInit from "@/components/ThemeInit";
import AppSettingsProvider from "@/components/AppSettingsProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import MobileNav from "@/components/MobileNav";

export const metadata = {
  title: "EchoAmp",
  description: "EchoAmp Music Player",
};

import GlobalChannelPlayer from "@/components/channel/GlobalChannelPlayer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="psysonic-dark"
      data-app-theme="psysonic-dark"
      data-app-accent="theme"
      suppressHydrationWarning
    >
      <body className="bg-[var(--app-bg)] text-white">
        <ThemeInit />

        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />

            <main className="app-main-scroll min-w-0 flex-1 overflow-y-auto pb-28">
              <GlobalSearchBar />
              {children}
<GlobalChannelPlayer />
            </main>
          </div>

          <MobileNav />
          <AppearanceProvider />
          <AppSettingsProvider />
          <PlayerProvider />
          <NowPlayingRedirect />
        </ToastProvider>
      </body>
    </html>
  );
}
