const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Local bill reminders do not need APNs. List this plugin before
 * expo-notifications so this entitlements mod runs after it (withMod stack).
 */
function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
}

module.exports = withLocalNotificationsOnly;
