import * as express from "express";
import * as fs from "fs";
import { Server } from "http";
import * as cors from "cors";

const app = express();

// Enable JSON body parsing middleware
app.use(express.json());
app.use(cors());

// This is a global variable that will store the current file name
let currentFileName: string | null = null;
let json: string | null = null;

app.post("/save-dashboard", (req, res) => {
  const data = req.body;

  // Check if a file name has been set
  if (!currentFileName) {
    console.error("No file name set");
    res.sendStatus(500); // Send a 500 Internal Server Error response if no file name has been set
    return;
  }

  const jsonData = JSON.stringify(data.dashboard, null, 2);

  // Write the JSON string to a file
  fs.writeFile(currentFileName, jsonData, "utf-8", (err) => {
    if (err) {
      console.error("Error writing file:", err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

app.get("/load-dashboard", (req, res) => {
  // Check if a file name has been set
  if (!json) {
    console.error("No dashboard JSON set");
    res.sendStatus(500);
    return;
  }

  res.send(json);
});

// Expose a method to set the current file name
export function setCurrentFileName(fileName: string) {
  currentFileName = fileName;
}

export function setJson(jsonData: string) {
  json = jsonData;
}

let server: Server;

export function startServer() {
  server = app.listen(3001, () => {
    console.log("Server is running on port 3001");
  });
}

export function stopServer() {
  if (server) {
    server.close();
  }
}
