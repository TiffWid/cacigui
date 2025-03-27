const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 3006; // Different port for the receive server

app.use(express.json());

// Define the path to the receiving Python script
const PYTHON_SCRIPT_PATH_REC = path.join(__dirname, "..", "CACI-GUI", "SDR-GUI", "pkt_rcv_psk.py");

// Function to run the receiving script continuously
const runReceiveScript = () => {
  setInterval(() => {
    exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" "${PYTHON_SCRIPT_PATH_REC}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`Receive Script Output: ${stdout}`);
    });
  }, 5000); // Run the receiving script every 5 seconds, adjust as needed
};

// Endpoint to manually trigger the receiving script
app.get("/run-receive-script", (req, res) => {
  exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" "${PYTHON_SCRIPT_PATH_REC}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send("Error running script");
    }
    console.log(stdout);
    res.json({ message: "Script ran successfully", output: stdout });
  });
});

// Start the continuous receiving process
runReceiveScript();

// Start the server
app.listen(PORT, () => {
  console.log(`Receive Server running on http://localhost:${PORT}`);
});
