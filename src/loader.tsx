export default function Loader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="h-12 w-12 rounded-full border-2 border-foreground/25 border-t-foreground animate-spin" />
    </div>
  );
}