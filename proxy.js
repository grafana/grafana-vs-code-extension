const httpProxy = require('http-proxy');
const express = require('express');
const fs = require('fs');

const URL = 'http://localhost:3000';
const user = 'admin';
const pass = 'admin';
const hostHead = 'localhost:3000';
const app = express()
const proxy = httpProxy.createProxyServer({target: URL, ws: true});
const server = require('http').createServer(app);
const jsonParser = express.json();

//tls.connect({host:'h5api.wapa.taobao.com', port:443, ciphers:'ECDHE-ECDSA-AES256-GCM-SHA384'})

function getMeta() {
  return {
    "type": "db",
    "canSave": true,
    "canEdit": true,
    "canAdmin": true,
    "canStar": true,
    "canDelete": true,
    "slug": "dashboard1",
    "url": "/d/0QjyD0-Vz/dashboard1",
    "expires": "0001-01-01T00:00:00Z",
    "created": "2023-03-13T13:10:17Z",
    "updated": "2023-03-13T13:10:17Z",
    "updatedBy": "admin",
    "createdBy": "admin",
    "version": 1,
    "hasAcl": false,
    "isFolder": false,
    "folderId": 0,
    "folderUid": "",
    "folderTitle": "General",
    "folderUrl": "",
    "provisioned": false,
    "provisionedExternalId": "",
    "annotationsPermissions": {
      "dashboard": {
        "canAdd": true,
        "canEdit": true,
        "canDelete": true
      },
      "organization": {
        "canAdd": true,
        "canEdit": true,
        "canDelete": true
      }
    },
    "hasPublicDashboard": false,
    "publicDashboardAccessToken": "",
    "publicDashboardUid": "",
    "publicDashboardEnabled": false
  };
}

app.get('/api/dashboards/uid/:uid', function(req, res) {
  fs.readFile('dash.json', function(err, data) {
    if (err) {
      res.send("ERROR!");
      return;
    }
    res.send({
      meta: getMeta(),
      dashboard: JSON.parse(data),
    });
  });
});

app.post('/api/dashboards/db/', express.json());
app.post('/api/dashboards/db/', function(req, res) {
  fs.writeFile('dash.json', JSON.stringify(req.body.dashboard), {mode: 0644}, function(){});
  res.send({"id":2,"slug":"dashboard1","status":"success","uid":"0QjyD0-Vz","url":"/d/0QjyD0-Vz/dashboard1","version":3});
});

app.get('/*', function (req, res) {
  console.log(`GET: ${req.url}`);
  proxy.web(req, res, {});
});

app.post('/*', function(req, res) {
  console.log(`POST: ${req.url}`);
  proxy.web(req, res, {});
});

server.on('upgrade', function(req, socket, head) {
  console.log("proxying upgrade request", req.url);
  proxy.ws(req, socket, head);
});

app.listen(3001);
