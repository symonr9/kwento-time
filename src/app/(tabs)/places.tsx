import { TabTemplateScreen } from '@/components/ui/tab-template-screen';

export default function PlacesScreen() {
  return (
    <TabTemplateScreen
      eyebrow="Places"
      title="Context for where connection happens."
      description="A template for neighborhoods, venues, recurring gatherings, and the people commonly tied to each place."
      metrics={[
        { label: 'Places', value: '0', tone: 'primaryMuted' },
        { label: 'Upcoming', value: '0', tone: 'accentMuted' },
        { label: 'Linked people', value: '0', tone: 'highlightMuted' },
      ]}
      sections={[
        {
          title: 'Place mode',
          body: 'Build a card stack here that helps you prepare before walking into a room.',
          tone: 'highlight',
        },
        {
          title: 'Shared context',
          body: 'Connect people, conversations, and reminders to the places where they matter.',
          tone: 'primary',
        },
      ]}
    />
  );
}
