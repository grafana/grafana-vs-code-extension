import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import { Server } from "http";

const app = express();

// Enable JSON body parsing middleware
app.use(express.json());

// This is a global variable that will store the current file name
let currentFileName: string | null = null;

app.post("save-dashboard", (req, res) => {
  const data = req.body;

  console.log("got data", data, currentFileName);
  // Check if a file name has been set
  if (!currentFileName) {
    console.error("No file name set");
    res.sendStatus(500); // Send a 500 Internal Server Error response if no file name has been set
    return;
  }
  const filePath = path.join(__dirname, "dashboards", currentFileName);
  const jsonData = JSON.stringify(data, null, 2);

  // Write the JSON string to a file
  fs.writeFile(filePath, jsonData, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      res.sendStatus(500); // Send a 500 Internal Server Error response if something goes wrong
    } else {
      res.sendStatus(200); // Send a 200 OK response if the file is written successfully
    }
  });
});

// Expose a method to set the current file name
export function setCurrentFileName(fileName: string) {
  currentFileName = fileName;
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
