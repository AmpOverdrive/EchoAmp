import AlbumCollectionPage from "@/components/library/AlbumCollectionPage";

export default function NewReleasesPage() {
  return (
    <AlbumCollectionPage
      title="New Releases"
      description="Recently added albums and fresh arrivals in your Navidrome library."
      type="newest"
      fetchAll={false}
      pageSize={100}
    />
  );
}
