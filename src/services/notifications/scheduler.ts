import * as Notifications from 'expo-notifications';

import type { Reminder } from '@/db/schema';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function reminderCopy(reminder: Reminder) {
  if (reminder.type === 'follow_up') {
    return {
      body: 'You have a question to ask next time.',
      title: 'Follow up',
    };
  }

  if (reminder.type === 'topic_expiry') {
    return {
      body: 'A talking point is expiring soon.',
      title: 'Review topic',
    };
  }

  return {
    body: 'A relationship nudge is ready.',
    title: 'Kwento Time',
  };
}

export async function ensureNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return next.granted;
}

export async function scheduleReminderNotification(reminder: Reminder) {
  if (reminder.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
  }

  const copy = reminderCopy(reminder);

  return Notifications.scheduleNotificationAsync({
    content: {
      body: copy.body,
      data: {
        relatedId: reminder.relatedId,
        reminderId: reminder.id,
        type: reminder.type,
      },
      sound: 'default',
      title: copy.title,
    },
    trigger: {
      date: reminder.scheduledAt,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

export async function cancelReminderNotification(notificationId: string | null) {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}
