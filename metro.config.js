// Lets Metro resolve the `.sql` migration files that Drizzle generates and
// that babel-plugin-inline-import inlines (see babel.config.js).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
