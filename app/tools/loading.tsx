import { Loader2 } from 'lucide-react';

export default function ToolsLoading() {
  return (
    <main className="min-h-screen pt-20 pb-20 px-4 bg-brand-bg">
      <div className="max-w-7xl mx-auto py-24 flex justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </main>
  );
}

