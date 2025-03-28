const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

// Define paths
const UPLOADS_DIR = path.join(__dirname, "uploads");
//const PYTHON_SCRIPT_PATH = path.join(__dirname, "..","CACI-GUI", "SDR-GUI", "pkt_xmt_psk.py");
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..","CACI-GUI", "testin", "gr-control", "Transmitters", "pkt_xmt.py");

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Endpoint to save the message as a .txt file
app.post("/save-message", (req, res) => {
  const { fileName, fileContent } = req.body;

  if (!fileName || !fileContent.trim()) {
    return res.status(400).json({ error: "Invalid input. Filename and content are required." });
  }

  const filePath = path.join(UPLOADS_DIR, fileName);

  fs.writeFile(filePath, fileContent, (err) => {
    if (err) {
      console.error("Error saving message:", err);
      return res.status(500).json({ error: "Failed to save message." });
    }
    console.log("Message saved:", filePath);
    res.json({ message: "Message saved successfully", filePath });
  });
});

// Endpoint to execute the Python script with the saved file
app.get("/run-script", (req, res) => {
  const { fileName } = req.query;

  if (!fileName) {
    return res.status(400).json({ error: "Filename is required to run the script." });
  }

  const filePath = path.join(UPLOADS_DIR, fileName);
  const tmpOutput = path.join(__dirname, "output.tmp");
  const finalOutput = path.join(__dirname, "output.txt");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }

  // Command to run pkt_xmt.py
  const pythonCommand = `"C:\\Users\\Tiffa\\radioconda\\python.exe" "${PYTHON_SCRIPT_PATH}" --InFile="${filePath}"`;

  exec(pythonCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing pkt_xmt.py:", error);
      return res.status(500).json({ error: "Failed to execute pkt_xmt.py", details: error.message });
    }

    console.log("pkt_xmt.py Output:", stdout);

    // Run strip_preamble.py to process output.tmp into output.txt
    const stripPreambleScript = `"C:\\Users\\Tiffa\\radioconda\\python.exe" "${path.join(__dirname, "..", "CACI-GUI", "testin", "gr-control", "Receivers", "strip_preamble.py")}" "${tmpOutput}" "${finalOutput}"`;

    exec(stripPreambleScript, (stripError, stripStdout, stripStderr) => {
      if (stripError) {
        console.error("Error executing strip_preamble.py:", stripError);
        return res.status(500).json({ error: "Failed to execute strip_preamble.py", details: stripError.message });
      }

      console.log("strip_preamble.py Output:", stripStdout);

      // Read the final output file and send the content to frontend
      fs.readFile(finalOutput, "utf8", (readErr, fileContent) => {
        if (readErr) {
          console.error("Error reading output.txt:", readErr);
          return res.status(500).json({ error: "Failed to read output.txt" });
        }

        res.json({ message: "Script executed successfully", output: fileContent });
      });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

