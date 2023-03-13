import * as http from "http"
import * as proxy from "http-proxy"

export function setupProxy() {
  proxy.createProxyServer({target:'http://localhost:9000'}).listen(8000, () => {
    console.log("proxy started")
  });

  http.createServer(function (req, res) {
    console.log("received request")
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('request successfully proxied!' + '\n' + JSON.stringify(req.headers));
    res.end();
  }).listen(9000);
}
