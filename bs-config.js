module.exports = {
  proxy: "localhost:3000",
  files: ["public/**/*.{html,css,js}", "server/**/*.js"],
  port: process.env.BROWSER_SYNC_PORT || 4000,
  open: false,
  notify: true,
  reloadDelay: 500,
  watchOptions: {
    ignored: ['node_modules/', '*.log']
  },
  snippetOptions: {
    rule: {
      match: /<\/body>/i,
      fn: function(snippet, match) {
        return snippet + match;
      }
    }
  },
  socket: {
    domain: 'localhost:' + (process.env.BROWSER_SYNC_PORT || 4000)
  }
};
