import React, { useState, createRef, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";
import { supabase } from "./supabase"; // Import Supabase client
import GoogleLoginButton from "./GoogleLoginButton";

const ALLOWED_EMAILS = [
  "nehabijoy@vt.edu",
  "nehabijoy100@gmail.com",
  "tiffanyawidjaja@gmail.com",
];

const DraggableBlocks = ({ savedConfigs, setSavedConfigs }) => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [relayCount, setRelayCount] = useState(0);
  const [configName, setConfigName] = useState("");
  

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

  const fetchLatestRelayPower = async (relayNumber, blockId) => {
      try {
        const { data, error } = await supabase
          .from("relay_power")
          .select("power_in, power_out")
          .eq("relay_number", relayNumber)
          .order("time_stamp", { ascending: false })
          .limit(1);
    
        if (error) throw error;
    
        if (data && data.length > 0) {
          const { power_in, power_out } = data[0];
    
          setBlocks((prevBlocks) =>
            prevBlocks.map((block) =>
              block.id === blockId
                ? {
                    ...block,
                    settings: {
                      ...block.settings,
                      powerIn: power_in,
                      powerOut: power_out,
                    },
                  }
                : block
            )
          );
        }
      } catch (err) {
        console.error("Error fetching relay power:", err.message);
      }
    };
    
  
    const fetchLatestRxPower = async (blockId) => {
      try {
        const { data, error } = await supabase
          .from('rx_power') // can be renamed to 'rx_power' if you're using a separate table
          .select('power_level')
          .order('time_stamp', { ascending: false })
          .limit(1);
    
        if (error) throw error;
    
        if (data && data.length > 0) {
          const latestPower = data[0].power_level;
    
          setBlocks((prevBlocks) =>
            prevBlocks.map((block) =>
              block.id === blockId
                ? {
                    ...block,
                    settings: {
                      ...block.settings,
                      powerLevel: latestPower,
                    },
                  }
                : block
            )
          );
        }
      } catch (err) {
        console.error("Error fetching RX power:", err.message);
      }
    };

    const handleRemoveBlock = (blockId) => {
      const confirmDelete = window.confirm("Are you sure you want to remove this block?");
      if (!confirmDelete) return;
    
      setBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== blockId));
      
      // Deselect block if it's the one being removed
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(null);
      }
    };

    const handleClick = (block) => {
      setSelectedBlock(block);
    
      if (block.type === "RX Antenna") {
        fetchLatestRxPower(block.id);
      }
    
      if (block.type.includes("Relay")) {
        const relayNumber = parseInt(block.type.split(" ")[1]); // Extract number from "Relay 1"
        fetchLatestRelayPower(relayNumber, block.id);
      }
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

  const deleteConfiguration = async (name) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
    
        if (!session?.user) throw new Error("User not authenticated");
    
        const userId = session.user.id;
    
        const { error } = await supabase
          .from("configurations")
          .delete()
          .match({ user_id: userId, config_name: name });
    
        if (error) throw error;
    
        // Remove from local state
        const updatedConfigs = { ...savedConfigs };
        delete updatedConfigs[name];
        setSavedConfigs(updatedConfigs);
    
        alert(`Deleted configuration: ${name}`);
      } catch (err) {
        console.error("Failed to delete configuration:", err.message);
        alert("Failed to delete configuration.");
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
                <div className="block-image">
                  {block.type}
                  {block.type !== "Object" && (
                  <div className="arrows">
                    {block.arrows.top && <div className="arrow arrow-up">↑</div>}
                    {block.arrows.right && <div className="arrow arrow-right">→</div>}
                    {block.arrows.bottom && <div className="arrow arrow-down">↓</div>}
                    {block.arrows.left && <div className="arrow arrow-left">←</div>}
                  </div>
                )}
                </div>
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

          {selectedBlock && (
            <button className="button remove-button" onClick={() => handleRemoveBlock(selectedBlock.id)}>
              Remove Block
            </button>
          )}

          {selectedBlock.type !== "Object" && (
              <div className="checkbox-group">
                <label><input type="checkbox" checked={selectedBlock.arrows.top} onChange={() => toggleArrow("top")} /> Top Arrow</label>
                <label><input type="checkbox" checked={selectedBlock.arrows.right} onChange={() => toggleArrow("right")} /> Right Arrow</label>
                <label><input type="checkbox" checked={selectedBlock.arrows.bottom} onChange={() => toggleArrow("bottom")} /> Bottom Arrow</label>
                <label><input type="checkbox" checked={selectedBlock.arrows.left} onChange={() => toggleArrow("left")} /> Left Arrow</label>
              </div>
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
          <div key={name} style={{ marginBottom: "5px" }}>
            <button onClick={() => loadConfiguration(name)}>{name}</button>
            <button
              style={{
                marginLeft: "5px",
                color: "white",
                backgroundColor: "red",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
              }}
              onClick={() => deleteConfiguration(name)}
            >
              ✕
            </button>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedConfigs, setSavedConfigs] = useState({});

  useEffect(() => {
    const fetchSessionAndConfigs = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error fetching session:", error.message);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const userId = session.user.id;

      const { data, error: configError } = await supabase
        .from("configurations")
        .select("config_name, blocks")
        .eq("user_id", userId);

      if (configError) {
        console.error("Error fetching configs:", configError.message);
        setLoading(false);
        return;
      }

      const configs = {};
      data.forEach((row) => {
        configs[row.config_name] = row.blocks;
      });

      setSavedConfigs(configs);
      setLoading(false);
    };

    fetchSessionAndConfigs();
  }, []);

  return loading ? <h2>Loading...</h2> : (
    <div>
      <div style={{ backgroundColor: "red", padding: "10px", textAlign: "center" }}>
        <h2>Communication Relay System​ GUI</h2>
        {user ? <p>✅ Logged in as {user.email}</p> : <GoogleLoginButton />}
      </div>
      {user ? <DraggableBlocks savedConfigs={savedConfigs} setSavedConfigs={setSavedConfigs} /> : null}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
reportWebVitals();



