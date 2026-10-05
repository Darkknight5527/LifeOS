import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { handleResponse } from "./src/reminders";
import App from "./App";

// Must be defined at module level so Android can run it when you tap a
// notification button while the app is closed (e.g. "+250 ml").
const TASK = "LIFEOS_NOTIFICATION_ACTIONS";
TaskManager.defineTask(TASK, async ({ data }) => {
  try {
    if (data && "actionIdentifier" in data) await handleResponse(data);
  } catch {
    /* nothing useful to do in the background */
  }
  return Notifications.BackgroundNotificationTaskResult.NoData;
});
Notifications.registerTaskAsync(TASK).catch(() => {});

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

registerRootComponent(App);
