// Hand-written database types matching the supabase migrations.
// In a real project, regenerate with `supabase gen types typescript`.

export type ContentType = 'tool' | 'article' | 'repo' | 'docs' | 'other';
export type LinkStatus = 'pending' | 'analyzing' | 'ready' | 'failed';
export type LinkSource = 'manual' | 'bulk' | 'extension' | 'bookmarklet' | 'telegram' | 'rss' | 'discover';
export type DigestFrequency = 'daily' | 'weekly' | 'monthly';
export type AutoTagCondition = 'domain_contains' | 'url_contains' | 'title_contains' | 'content_type_is';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: 'dark' | 'light';
  auto_retry_enabled: boolean;
  auto_retry_interval_hours: number;
  created_at: string;
}

export interface Link {
  id: string;
  user_id: string;
  url: string;
  normalized_url: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  favicon: string | null;
  content_type: ContentType;
  confidence: number;
  summary: string | null;
  key_points: string[];
  tags: string[];
  notes: string | null;
  status: LinkStatus;
  source: LinkSource;
  is_pinned: boolean;
  save_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
  last_failed_at: string | null;
  fail_reason: string | null;
  http_status: number | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_ai_generated: boolean;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface CollectionLink {
  collection_id: string;
  link_id: string;
  position: number;
}

export interface AutoTaggingRule {
  id: string;
  user_id: string;
  condition_type: AutoTagCondition;
  condition_value: string;
  tag_to_add: string;
  is_active: boolean;
  created_at: string;
}

export interface RssFeed {
  id: string;
  user_id: string;
  feed_url: string;
  title: string | null;
  last_fetched_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TelegramIntegration {
  id: string;
  user_id: string;
  bot_username: string | null;
  webhook_active: boolean;
  created_at: string;
}

export interface ExtensionToken {
  id: string;
  user_id: string;
  token_prefix: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface DigestSettings {
  user_id: string;
  frequency: DigestFrequency;
  email_enabled: boolean;
  last_sent_at: string | null;
}

export interface DigestHistory {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  summary_json: Record<string, unknown>;
  sent_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  link_id: string | null;
  url: string | null;
  title: string | null;
  score: number;
  reason: string | null;
  created_at: string;
  dismissed_at: string | null;
}

export interface TrendingSnapshot {
  id: string;
  scope: 'global' | 'user';
  user_id: string | null;
  period: string;
  topics: { topic: string; score: number; reason: string }[];
  generated_at: string;
}
