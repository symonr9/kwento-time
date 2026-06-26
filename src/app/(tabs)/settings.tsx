import { TabTemplateScreen } from '@/components/ui/tab-template-screen';

export default function SettingsScreen() {
  return (
    <TabTemplateScreen
      eyebrow="Settings"
      title="Keep local data calm and private."
      description="A neutral starting point for privacy, backup, export, notifications, and premium controls."
      metrics={[
        { label: 'Local-first', value: 'On', tone: 'primaryMuted' },
        { label: 'Backups', value: 'Off', tone: 'accentMuted' },
        { label: 'Plan', value: 'Free', tone: 'highlightMuted' },
      ]}
      sections={[
        {
          title: 'Privacy controls',
          body: 'Place biometric lock, local export, and delete-all-data actions here when those features land.',
          tone: 'primary',
        },
        {
          title: 'Notifications',
          body: 'Keep reminder permissions and quiet-hour settings readable and easy to revisit.',
          tone: 'accent',
        },
      ]}
    />
  );
}
