import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="text-2xl" />
      <p className="font-display text-7xl font-bold gradient-text">404</p>
      <h1 className="text-xl font-semibold">Page lost in the knowledge cosmos</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn't find that page. It might have been moved or never existed.
      </p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
