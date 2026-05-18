import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildHeatmap,
  contentMix,
  dayOfWeekActivity,
  linksOverTime,
  topTags,
} from '@/lib/stats';
import type { Link } from '@/types/database';
import { HeatmapGrid } from '@/components/common/HeatmapGrid';

const PALETTE = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#38bdf8', '#a78bfa', '#f472b6'];

const tooltipStyle = { background: 'rgba(10,10,12,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 };

export function LinksOverTimeChart({ links }: { links: Link[] }) {
  const data = linksOverTime(links, 30);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Links Saved (30 days)</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
            <YAxis tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ContentTypesDonut({ links }: { links: Link[] }) {
  const data = contentMix(links).map((d) => ({ name: d.type, value: d.count }));
  if (data.length === 0) data.push({ name: 'none', value: 1 });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Content Types</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="-mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          {data.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.name} <span className="text-muted-foreground">{d.value}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyPatternRadar({ links }: { links: Link[] }) {
  const data = dayOfWeekActivity(links);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Pattern</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TopTagsBar({ links }: { links: Link[] }) {
  const data = topTags(links, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Knowledge Areas</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet — save a few links to see your top topics.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="tag" width={90} tick={{ fill: '#bbb', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function ActivityHeatmap12W({ links }: { links: Link[] }) {
  const data = buildHeatmap(links, 12 * 7);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity (12 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <HeatmapGrid data={data} weeks={12} />
      </CardContent>
    </Card>
  );
}
