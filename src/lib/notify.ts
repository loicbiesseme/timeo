import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * Fine couche au-dessus du plugin de notifications Tauri :
 * demande la permission une seule fois, et échoue silencieusement
 * (log console) si l'OS la refuse.
 */
let granted: boolean | null = null;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (granted !== null) return granted;
  try {
    granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
  } catch (e) {
    console.error("[timeo] permission notifications :", e);
    granted = false;
  }
  return granted;
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return;
    sendNotification({ title, body });
  } catch (e) {
    console.error("[timeo] envoi de notification :", e);
  }
}
