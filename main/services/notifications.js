/**
 * Notification service - handles system notifications
 */
const { Notification } = require('electron');
const path = require('path');
const store = require('../store');
const { getIconPath } = require('../utils/paths');

/**
 * Show system notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Function} [onClick] - Optional click handler
 */
function showNotification(title, body, onClick) {
  const settings = store.get('settings');
  if (!settings.notificationsEnabled) return;

  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: getIconPath(),
      silent: false,
    });

    if (onClick) {
      notification.on('click', onClick);
    }

    notification.show();
  }
}

module.exports = {
  showNotification,
};
