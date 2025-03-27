import React, { useState, createRef, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";
import { supabase } from "./supabase"; // Import Supabase client
import GoogleLoginButton from "./GoogleLoginButton";
import axios from 'axios';

const ALLOWED_EMAILS = [
  "nehabijoy@vt.edu",
  "nehabijoy100@gmail.com",
  "tiffanyawidjaja@gmail.com",
];

const DraggableBlocks = () => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [relayCount, setRelayCount] = useState(0);
  const [savedConfigs, setSavedConfigs] = useState({});
  const [configName, setConfigName] = useState("");
  const [filePath, setFilePath] = useState(""); // state to store manual file path
  const [isManual, setIsManual] = useState(false); // state to toggle between upload and manual input

  const addBlock = (type) => {
    let blockName = type;

    if (type === "Relay") {
      const newRelayNumber = relayCount + 1;
      blockName = `Relay ${newRelayNumber}`;
      setRelayCount(newRelayNumber);
    }

    const newBlock = {
      id: Date.now(),
      type: blockName,
      nodeRef: createRef(),
      x: 100,
      y: 100,
      arrows: type === "Object" ? {} : { top: false, right: false, bottom: false, left: false },
      settings: type === "TX Antenna"
        ? { power: 10, rfOn: true, message: "", file: null, bandwidth: 20, battery: 100 }
        : type === "RX Antenna"
        ? { receivedMessage: "", powerLevel: 0, bandwidth: 15, battery: 100 }
        : type.includes("Relay")
        ? { powerIn: 0, powerOut: 0, battery: 100 }
        : {},
    };

    // After adding a block, check if it's an RX Antenna and run the corresponding Python script
    if (type === "RX Antenna") {
      runReceiveScript();
    }

    setBlocks([...blocks, newBlock]);
  };

  const runReceiveScript = async () => {
    try {
      // Send a request to the receiving server (Server 2) to trigger the Python receive script
      const response = await fetch("http://localhost:3006/run-receive-script", { method: "GET" });

      if (!response.ok) {
        console.error("Failed to run receive script.");
      }

      const data = await response.json();
      console.log("Receive script output:", data);
    } catch (err) {
      console.error("Error running receive script:", err);
    }
  };

  const handleClick = (block) => {
    setSelectedBlock(block);
  };

  const toggleArrow = (direction) => {
    if (selectedBlock) {
      setSelectedBlock((prev) => ({
        ...prev,
        arrows: { ...prev.arrows, [direction]: !prev.arrows[direction] },
      }));

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === selectedBlock.id
            ? { ...block, arrows: { ...block.arrows, [direction]: !block.arrows[direction] } }
            : block
        )
      );
    }
  };

  const handleTxFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = `tx-files/${Date.now()}-${file.name}`;

    // Create a FormData object to send the file to the transmitting server (Server 1)
    const formData = new FormData();
    formData.append("file", file, fileName);

    try {
      // Upload the file to the transmitting Node.js backend (Server 1)
      const uploadResponse = await fetch("http://localhost:3005/upload-file", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        console.log("File Not Uploaded");
      }

      const { fileUrl } = await uploadResponse.json();
      console.log("File uploaded successfully:", fileUrl);

      // Call the transmitting Python script via the backend API (Server 1) with the file URL
      const scriptResponse = await fetch(`http://localhost:3005/run-script?fileUrl=${encodeURIComponent(fileUrl)}`);
      const scriptData = await scriptResponse.json();

      console.log("Python Script Output:", scriptData);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedBlock || !selectedBlock.settings.message.trim()) {
      console.log("Message is required");
      return;
    }

    const fileName = `message-${Date.now()}.txt`;
    const fileContent = selectedBlock.settings.message;

    try {
      // Save message to a file on the transmitting server (Server 1)
      const response = await fetch("http://localhost:3005/save-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileContent }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Message saved successfully:", data);

        // Run the transmitting Python script (Server 1) with the saved file
        const scriptResponse = await fetch(`http://localhost:3005/run-script?fileName=${encodeURIComponent(fileName)}`);
        const scriptData = await scriptResponse.json();

        console.log("Python Script Output:", scriptData);
      } else {
        console.error("Failed to save message:", data);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleDrag = (e, data, block) => {
    const newBlocks = blocks.map((b) =>
      b.id === block.id ? { ...b, x: data.x, y: data.y } : b
    );
    setBlocks(newBlocks);
  };

  const saveConfiguration = () => {
    if (configName.trim()) {
      setSavedConfigs({ ...savedConfigs, [configName]: blocks });
      setConfigName("");
    }
  };

  const loadConfiguration = (name) => {
    if (savedConfigs[name]) {
      setBlocks(savedConfigs[name]);
    }
  };

  const updateBlockFromBackend = async (blockId) => {
    try {
      const response = await fetch(`https://your-backend-api.com/block/${blockId}`);
      const data = await response.json();

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === blockId
            ? { ...block, settings: { ...block.settings, ...data } }
            : block
        )
      );

      if (selectedBlock && selectedBlock.id === blockId) {
        setSelectedBlock((prev) => ({ ...prev, settings: { ...prev.settings, ...data } }));
      }
    } catch (error) {
      console.error("Error fetching block data:", error);
    }
  };

  useEffect(() => {
      const interval = setInterval(() => {
        blocks.forEach((block) => updateBlockFromBackend(block.id));
      }, 5000);
      return () => clearInterval(interval);
    }, [blocks]);

  return (
    <div className="container">
      <div className="draggable-container">
        <div className="button-container">
          <button className="button" onClick={() => addBlock("RX Antenna")}>Add RX Antenna</button>
          <button className="button" onClick={() => addBlock("TX Antenna")}>Add TX Antenna</button>
          <button className="button" onClick={() => addBlock("Relay")}>Add Relay</button>
          <button className="button" onClick={() => addBlock("Object")}>Add Object</button>
        </div>

        <div className="block-container">
          {blocks.map((block) => (
            <Draggable key={block.id} nodeRef={block.nodeRef} bounds="parent"
              position={{ x: block.x, y: block.y }} onStop={(e, data) => handleDrag(e, data, block)} >
              <div ref={block.nodeRef} className="block" onClick={() => handleClick(block)}>
                <div className="block-image">{block.type}</div>
              </div>
            </Draggable>
          ))}
        </div>
      </div>

      <div className="info-panel">
        {selectedBlock ? (
          <div className="info-box">
            <h3>{selectedBlock.type} Settings</h3>

            {selectedBlock.type === "TX Antenna" && (
              <>
                <label>Power Level:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.power}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                  }
                />
                <label>Message:</label>
                <input
                  type="text"
                  value={selectedBlock.settings.message}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, message: e.target.value } })
                  }
                />
                <button onClick={handleSendMessage}>Send Message</button>

                <label>Upload Message File:</label>
                <input
                  type="file"
                  onChange={(e) => handleTxFileUpload(e)}
                />
              </>
            )}

          {selectedBlock.type === "RX Antenna" && (
              <>
                <label>Received Message:</label>
                <input
                  type="text"
                  value={selectedBlock.settings.receivedMessage}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, receivedMessage: e.target.value } })
                  }
                />
                <label>Power Level:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerLevel}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerLevel: e.target.value } })
                  }
                />
              </>
            )}

            {selectedBlock.type.includes("Relay") && (
              <>
                <label>Power In:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerIn}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerIn: e.target.value } })
                  }
                />
                <label>Power Out:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerOut}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerOut: e.target.value } })
                  }
                />
              </>
            )}
          </div>
        ) : (
          <div className="info-box">
            <h3>Select a Block</h3>
            <p>Click on a block to configure settings.</p>
          </div>
        )}

        <div className="info-box">
          <input type="text" value={configName} onChange={(e) => setConfigName(e.target.value)}
            placeholder="Enter configuration name" />
          <button className="button" onClick={saveConfiguration}>Save Configuration</button>
          <h4>Saved Configurations:</h4>
          {Object.keys(savedConfigs).map((name) => (
            <button key={name} onClick={() => loadConfiguration(name)}>{name}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Error fetching session:", error);
            return;
        }

        if (data.session) {
            const userEmail = data.session.user.email;
            if (ALLOWED_EMAILS.includes(userEmail)) {
                setUser(data.session.user);
            }
        }
        setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {!user ? (
        <GoogleLoginButton setUser={setUser} />
      ) : (
        <DraggableBlocks />
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
reportWebVitals();



