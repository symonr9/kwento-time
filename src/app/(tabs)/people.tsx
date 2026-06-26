import { TabTemplateScreen } from '@/components/ui/tab-template-screen';

export default function PeopleScreen() {
  return (
    <TabTemplateScreen
      eyebrow="People"
      title="Your relationship memory."
      description="A starter page for the people list, contact rhythm, health scores, and recent conversation context."
      metrics={[
        { label: 'People', value: '0', tone: 'primaryMuted' },
        { label: 'Needs a nudge', value: '0', tone: 'accentMuted' },
        { label: 'Recent chats', value: '0', tone: 'highlightMuted' },
      ]}
      sections={[
        {
          title: 'People list',
          body: 'Use this page for searchable profiles, tags, last-contact dates, and quick note actions.',
          tone: 'primary',
        },
        {
          title: 'Remembered details',
          body: 'Profile pages can surface life updates, open loops, and topics worth revisiting.',
          tone: 'accent',
        },
      ]}
    />
  );
}
