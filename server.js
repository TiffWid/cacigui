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
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..", "cacigui", "SDR-GUI", "pkt_xmt_psk.py");

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const REPEAT_COUNT = 100; // Number of times to repeat the content

// Endpoint to save the message as a .txt file
app.post("/save-message", (req, res) => {
  const { fileName, fileContent } = req.body;

  if (!fileName || !fileContent.trim()) {
    return res.status(400).json({ error: "Invalid input. Filename and content are required." });
  }

  const modifiedContent = (fileContent + ";").repeat(REPEAT_COUNT);
  const filePath = path.join(UPLOADS_DIR, fileName);

  fs.writeFile(filePath, modifiedContent, (err) => {
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

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }

  // Command to run pkt_xmt.py
  const pythonCommand = `python3 "${PYTHON_SCRIPT_PATH}" --InFile="${filePath}"`;

  exec(pythonCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing pkt_xmt.py:", error);
      return res.status(500).json({ error: "Failed to execute pkt_xmt.py", details: error.message });
    }

    console.log("pkt_xmt.py Output:", stdout);
    res.json({ message: "Script executed successfully", output: stdout });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

