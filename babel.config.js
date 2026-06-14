// babel-preset-expo auto-enables the React Compiler from app.json's
// `experiments.reactCompiler`. The inline-import plugin lets Drizzle's
// generated migrations bundle `.sql` files at build time (see metro.config.js).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
