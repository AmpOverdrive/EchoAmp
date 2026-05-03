import AlbumCollectionPage from "@/components/library/AlbumCollectionPage";

export default function AlbumsPage() {
  return (
    <AlbumCollectionPage
      title="All Albums"
      description="Browse a deep slice of albums from your library."
      type="alphabeticalByName"
      showToolbar
    />
  );
}
