export default function SitePageLoading() {
  return (
    <div className="min-h-screen bg-base">
      <div className="mx-auto max-w-7xl animate-pulse px-6 py-4">
        <div className="mb-8 h-8 w-40 rounded bg-surface" />
        <div className="space-y-4">
          <div className="h-10 w-2/3 max-w-md rounded bg-surface" />
          <div className="h-4 w-full max-w-xl rounded bg-surface" />
          <div className="h-4 w-5/6 max-w-lg rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}
