import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import axios, { AxiosError } from 'axios';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

const TASK_NAME = 'backgroundLocationTask';
const API_URL = 'http://192.168.1.4:5000/api/check-location';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const requestNotificationPermission = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.error('❌ Notification permissions not granted');
    return false;
  }
  return true;
};

export const startBackgroundLocationTracking = async () => {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return;

  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('❌ Foreground location permission not granted');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('❌ Background location permission not granted');
      return;
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (!isStarted) {
      console.log('🚀 Starting background location tracking...');

      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 minutes (300,000 ms)
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,

        foregroundService: {
          notificationTitle: '📍 Accident Alert',
          notificationBody: 'Tracking your location in the background.',
          notificationColor: '#4f46e5',
          killServiceOnDestroy: false,
        },
      });

      console.log('✅ Background location tracking started');
    }
  } catch (err) {
    console.error('🚨 Error starting background tracking:', err);
  }
};
const keepBackgroundAlive = async () => {
  AppState.addEventListener('change', async (state) => {
    if (state === 'background') {
      console.log('🔄 Restarting background service...');
      await startBackgroundLocationTracking();
    }
  });
};

const sendNotification = async (title: string, body: string, persistent = false) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      vibrate: [200, 400, 200],
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });

  if (persistent) {
    setTimeout(async () => {
      await sendNotification(title, body, persistent);
    }, 60000);
  }
};

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('🚨 Background Task Error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      console.log('📍 Background Location Update:', { latitude, longitude });

      try {
        const response = await axios.post(API_URL, { lat: latitude, lng: longitude });

        const { zone, message } = response.data;
        console.log(`🟩 Zone: ${zone} - ${message}`);

        if (zone === 'red') {
          await sendNotification('🚨 Red Zone Alert!', message, true);
        } else if (zone === 'yellow') {
          await sendNotification('⚠️ Caution: Yellow Zone', message);
        }

      } catch (err) {
        console.error('🚨 Error calling check-location API:', (err as AxiosError).message);
      }
    }
  }

  setInterval(async () => {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (!isRunning) {
      console.log('🔄 Restarting background location service...');
      await startBackgroundLocationTracking();
    }
  }, 60000);
});
