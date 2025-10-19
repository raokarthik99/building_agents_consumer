export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/70">
      <div className="flex w-full items-center justify-between px-5 py-4 text-xs text-slate-500 md:px-8">
        <span>© {year} Workspace</span>
        <span>Lightweight conversations</span>
      </div>
    </footer>
  );
}
