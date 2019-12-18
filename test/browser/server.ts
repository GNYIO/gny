const express = require('express');
const webpack = require('webpack');
const middleware = require('webpack-dev-middleware');

const compiler = webpack(require('../../packages/client/webpack.config.js'));

let port = 4444;
const index = Math.max(
  process.argv.indexOf('--port'),
  process.argv.indexOf('-p')
);
if (index !== -1) {
  port = +process.argv[index + 1] || port;
}

const app = express()
  .use(middleware(compiler, { serverSideRender: true }))
  .use((req, res) => {
    const path = 'browser.js';
    res.send(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GNY Client Test</title>
        </head>
        <body>
          <div id="root"></div>
          <script src="${path}"></script>
        </body>
      </html>`
    );
  })
  .listen(port, () => {
    console.log(`Server started at http://localhost:${port}/`);
  });
