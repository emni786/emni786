import { Link as RouterLink } from 'react-router-dom';
import { Library, Compass, BarChart3, Plus } from 'lucide-react';
import { useLinks } from '@/hooks/useLinks';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { computeStats } from '@/lib/stats';
import { timeOfDayGreeting } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCards } from '@/components/dashboard/StatCards';
import { AnalyzingWidget } from '@/components/dashboard/AnalyzingWidget';
import { QuickAdd, QuickSearch } from '@/components/dashboard/QuickAdd';
import { KnowledgeAtoms } from '@/components/dashboard/KnowledgeAtoms';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatusBars } from '@/components/dashboard/StatusBars';
import { TrendingTopicsCard } from '@/components/dashboard/TrendingTopicsCard';
import { NavTiles } from '@/components/dashboard/NavTiles';
import {
  ActivityHeatmap12W,
  ContentTypesDonut,
  LinksOverTimeChart,
  TopTagsBar,
  WeeklyPatternRadar,
} from '@/components/dashboard/DashboardCharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: links = [], isLoading } = useLinks();
  const { data: collections = [] } = useCollections();
  const stats = computeStats(links, collections.length);

  const name = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'friend';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {timeOfDayGreeting()}, {name} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">Here's your knowledge overview for today.</p>
      </div>

      {/* Hero atoms */}
      {isLoading ? <Skeleton className="h-48 w-full" /> : <KnowledgeAtoms links={links} />}

      {/* Quick Add + Search */}
      <div className="grid gap-3 lg:grid-cols-2">
        <QuickAdd />
        <QuickSearch />
      </div>

      {/* Quick nav buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <RouterLink to="/library">
            <Library className="h-4 w-4" /> Library
          </RouterLink>
        </Button>
        <Button variant="outline" asChild>
          <RouterLink to="/knowledge">
            <Compass className="h-4 w-4" /> Discover
          </RouterLink>
        </Button>
        <Button variant="outline" asChild>
          <RouterLink to="/analytics">
            <BarChart3 className="h-4 w-4" /> Analytics
          </RouterLink>
        </Button>
        <Button variant="default" asChild>
          <RouterLink to="/library">
            <Plus className="h-4 w-4" /> Add link
          </RouterLink>
        </Button>
      </div>

      {/* 4 stat cards */}
      <StatCards stats={stats} />

      {/* Analyzing live */}
      <AnalyzingWidget links={links} />

      {/* Activity feed + status + top tags */}
      <div className="grid gap-3 lg:grid-cols-3">
        <RecentActivity links={links} />
        <StatusBars stats={stats} />
        <TopTagsBar links={links} />
      </div>

      {/* Trending + Quick discover */}
      <div className="grid gap-3 lg:grid-cols-2">
        <TrendingTopicsCard />
        <DiscoverCard />
      </div>

      {/* Charts row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <LinksOverTimeChart links={links} />
        <ContentTypesDonut links={links} />
        <WeeklyPatternRadar links={links} />
      </div>

      {/* 12-week heatmap */}
      <ActivityHeatmap12W links={links} />

      {/* Bottom nav tiles */}
      <NavTiles />
    </div>
  );
}

function DiscoverCard() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="font-display text-sm uppercase tracking-wider text-muted-foreground">Quick Discover</p>
      <p className="mt-2 font-display text-lg font-semibold">Find your next great read</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate fresh recommendations based on your top tags and recent saves.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <RouterLink to="/knowledge">Open Knowledge Discovery →</RouterLink>
      </Button>
    </div>
  );
}
