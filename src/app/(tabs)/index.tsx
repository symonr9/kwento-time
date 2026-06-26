import { TabTemplateScreen } from '@/components/ui/tab-template-screen';

export default function HomeScreen() {
  return (
    <TabTemplateScreen
      eyebrow="Today"
      title="Keep the next conversation close."
      description="A quiet home base for upcoming reminders, recent notes, and the people you want to stay connected with."
      metrics={[
        { label: 'Follow-ups waiting', value: '0', tone: 'primaryMuted' },
        { label: 'People remembered', value: '0', tone: 'accentMuted' },
        { label: 'Places saved', value: '0', tone: 'highlightMuted' },
      ]}
      sections={[
        {
          title: 'Conversation capture',
          body: 'This space can become the fast entry point for notes, transcripts, and summaries.',
          tone: 'primary',
        },
        {
          title: 'Social forecast',
          body: 'Prepare for upcoming plans with talking points, follow-ups, and reminders.',
          tone: 'highlight',
        },
      ]}
    />
  );
}
