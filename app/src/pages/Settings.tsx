import { ProfileSection } from '@/components/settings/ProfileSection';
import { TelegramSection } from '@/components/settings/TelegramSection';
import { ExtensionSection } from '@/components/settings/ExtensionSection';
import { AutoTaggingSection } from '@/components/settings/AutoTaggingSection';
import { RssSection } from '@/components/settings/RssSection';
import { AutoRetrySection } from '@/components/settings/AutoRetrySection';
import { ExportSection } from '@/components/settings/ExportSection';
import { SessionsSection } from '@/components/settings/SessionsSection';
import { PasswordSection } from '@/components/settings/PasswordSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';

export default function Settings() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure how Xenonowledge captures, organises, and reports your knowledge.</p>
      </div>
      <ProfileSection />
      <TelegramSection />
      <ExtensionSection />
      <AutoTaggingSection />
      <RssSection />
      <AutoRetrySection />
      <ExportSection />
      <SessionsSection />
      <PasswordSection />
      <DeleteAccountSection />
    </div>
  );
}
