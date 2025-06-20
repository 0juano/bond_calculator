import { BarChart2 } from 'lucide-react';

export default function ComparablesPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="relative animate-in fade-in duration-300">
        {/* neon back-plate */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-green-400 via-blue-500 to-violet-600 opacity-25 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-4 bg-black/80 px-12 py-10 rounded-2xl shadow-lg">
          <BarChart2 size={32} className="text-white" />
          <h1 className="text-lg font-semibold tracking-wide text-white">Coming soon…</h1>
        </div>
      </div>
    </main>
  );
}