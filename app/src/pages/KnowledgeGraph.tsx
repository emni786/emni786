import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLinks } from '@/hooks/useLinks';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';

export default function KnowledgeGraphPage() {
  const { data: links = [] } = useLinks();
  const [fs, setFs] = useState(true);
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/knowledge"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        </Button>
        <Logo />
      </div>
      <KnowledgeGraph links={links} fullscreen={fs} onFullscreenChange={setFs} />
    </div>
  );
}
