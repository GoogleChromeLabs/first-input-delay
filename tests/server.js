let http = require('http');
let fs = require('fs');
let fidScript;
let indexHtml;

fidScript = fs.readFileSync('./src/first-input-delay.js', 'utf8');

indexHtml = `
<html>
  <head>
    <title>FID Page</title>
    <script>${fidScript}</script>
  </head>
  <h1>FID</h1>
  <p>First Input Delay</p>
  <span id="link1">Some link</span>
</html>`;

let server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(indexHtml);
});

server.on('close', () => {
  process.exit();
});

module.exports.start = (port) => {
  server.listen(port);
};

module.exports.stop = () => {
  server.close();
};
