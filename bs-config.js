module.exports = {
  proxy: "localhost:3000",
  files: ["public/**/*.{html,css,js}"],
  port: 4000,
  open: false,
  notify: false,
  reloadDelay: 500,
  snippetOptions: {
    rule: {
      match: /<\/body>/i,
      fn: function(snippet, match) {
        return snippet + match;
      }
    }
  }
};
