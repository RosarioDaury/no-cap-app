import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Bill, BillPayment } from '@/src/db/types';
import { formatMoney } from '@/src/lib/format';
import { ordinalDay, upcomingBillOccurrences } from '@/src/lib/bills';

export const BILLS_CHANNEL_ID = 'bills';
const ID_PREFIX = 'bill:';

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function notificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function billNotificationId(billId: string, month: string): string {
  return `${ID_PREFIX}${billId}:${month}`;
}

export async function ensureBillChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(BILLS_CHANNEL_ID, {
    name: 'Bill reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22D3EE',
  });
}

export async function getReminderPermissionGranted(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const ios = settings.ios?.status;
  return (
    ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  await ensureBillChannel();
  if (await getReminderPermissionGranted()) return true;
  const settings = await Notifications.requestPermissionsAsync();
  if (settings.granted) return true;
  const ios = settings.ios?.status;
  return (
    ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function cancelBillNotifications(billId?: string): Promise<void> {
  if (!notificationsSupported()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = billId ? `${ID_PREFIX}${billId}:` : ID_PREFIX;
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(prefix))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function syncBillNotifications(
  bills: Bill[],
  payments: BillPayment[],
  currency: string,
): Promise<void> {
  if (!notificationsSupported()) return;
  await ensureBillChannel();
  await cancelBillNotifications();

  const granted = await getReminderPermissionGranted();
  if (!granted) return;

  const paid = new Set(payments.map((p) => `${p.billId}:${p.month}`));
  const now = Date.now();

  for (const bill of bills) {
    if (!bill.remindersEnabled) continue;
    for (const occurrence of upcomingBillOccurrences(bill, 12)) {
      if (paid.has(`${bill.id}:${occurrence.monthKey}`)) continue;
      if (occurrence.reminder.getTime() <= now) continue;
      const dueLabel = ordinalDay(bill.dueDay);
      await Notifications.scheduleNotificationAsync({
        identifier: billNotificationId(bill.id, occurrence.monthKey),
        content: {
          title: `Pay ${bill.name}`,
          body: `${formatMoney(bill.amountCents, currency)} due the ${dueLabel}`,
          data: { billId: bill.id, screen: 'bills' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: occurrence.reminder,
          channelId: BILLS_CHANNEL_ID,
        },
      });
    }
  }
}
