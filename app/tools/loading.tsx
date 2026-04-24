import { Loader2 } from 'lucide-react';

export default function ToolsLoading() {
  return (
    <main className="min-h-screen pt-20 pb-20 bg-brand-bg">
      <div className="site-container py-24 flex justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </main>
  );
}
