export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/70 backdrop-blur">
      <div className="flex w-full items-center justify-between px-5 py-4 text-xs text-slate-500 md:px-8">
        <span>© {year} Agent Chat Workspace</span>
        <span>Lightweight conversations</span>
      </div>
    </footer>
  );
}
