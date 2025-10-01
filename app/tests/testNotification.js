const notificationService = require('../services/notificationService').default;

async function testNotification() {
  try {
    // First check if notifications are enabled
    const settings = await notificationService.getNotificationSettings();
    if (!settings.pushNotifications) {
      console.log('Push notifications are disabled. Please enable them in the app settings first.');
      return;
    }

    // Send a test market alert
    const notificationId = await notificationService.sendMarketAlert(
      'Gold',
      5.2,
      1950.75
    );

    if (notificationId) {
      console.log('Test notification sent successfully!');
      console.log('Notification ID:', notificationId);
    } else {
      console.log('Failed to send notification');
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

testNotification();
