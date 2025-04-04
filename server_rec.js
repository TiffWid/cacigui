const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 3006; // Different port for the receive server

app.use(express.json());

// Define paths for the receiving script and processing script
const PYTHON_SCRIPT_PATH_REC = path.join(__dirname, "..", "CACI-GUI", "testin", "gr-control", "Receivers", "pkt_rcv.py");
const STRIP_PREAMBLE_SCRIPT = path.join(__dirname, "..", "CACI-GUI", "testin", "gr-control", "Receivers", "strip_preamble.py");
const TMP_OUTPUT = path.join(__dirname, "output.tmp");
const FINAL_OUTPUT = path.join(__dirname, "output.txt");

// Function to run the receiving script continuously
const runReceiveScript = () => {
  setInterval(() => {
    exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" -u "${PYTHON_SCRIPT_PATH_REC}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing pkt_rcv.py: ${error}`);
        return;
      }
      console.log(`Receive Script Output: ${stdout}`);

      // Run strip_preamble.py to process output.tmp into output.txt
      exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" "${STRIP_PREAMBLE_SCRIPT}" "${TMP_OUTPUT}" "${FINAL_OUTPUT}"`, (stripError, stripStdout, stripStderr) => {
        if (stripError) {
          console.error("Error executing strip_preamble.py:", stripError);
          return;
        }
        console.log("strip_preamble.py Output:", stripStdout);
      });
    });
  }, 100000000); // Adjust the interval as needed
};

// Endpoint to manually trigger the receiving script
app.get("/run-receive-script", (req, res) => {
  exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" -u "${PYTHON_SCRIPT_PATH_REC}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing pkt_rcv.py: ${error}`);
      return res.status(500).send("Error running script");
    }
    console.log(stdout);
    
    // Run strip_preamble.py after receiving
    exec(`"C:\\Users\\Tiffa\\radioconda\\python.exe" "${STRIP_PREAMBLE_SCRIPT}" "${TMP_OUTPUT}" "${FINAL_OUTPUT}"`, (stripError, stripStdout, stripStderr) => {
      if (stripError) {
        console.error("Error executing strip_preamble.py:", stripError);
        return res.status(500).json({ error: "Failed to execute strip_preamble.py", details: stripError.message });
      }
      console.log("strip_preamble.py Output:", stripStdout);

      // Read the final output file and send the content
      fs.readFile(FINAL_OUTPUT, "utf8", (readErr, fileContent) => {
        if (readErr) {
          console.error("Error reading output.txt:", readErr);
          return res.status(500).json({ error: "Failed to read output.txt" });
        }
        res.json({ message: "Script executed successfully", output: fileContent });
      });
    });
  });
});

// Start the continuous receiving process
runReceiveScript();

// Start the server
app.listen(PORT, () => {
  console.log(`Receive Server running on http://localhost:${PORT}`);
});

