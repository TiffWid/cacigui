import React, { useState, createRef, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";
import { io } from "socket.io-client";
import { supabase } from "./supabase"; // Import Supabase client
import GoogleLoginButton from "./GoogleLoginButton";

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

    setBlocks([...blocks, newBlock]);
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

  const getRelayBlock = (relayNumber) => {
    return blocks.find((block) => block.type === `Relay ${relayNumber}`) || null;
  };

  // const getTxAntennaBlocks = () => {
  //   return blocks.filter((block) => block.type === "TX Antenna");
  // };

  // const getRxAntennaBlocks = () => {
  //   return blocks.filter((block) => block.type === "RX Antenna");
  // };

  //If a file is uploaded, run this function to run the python script
  const handleTxFileUpload = (e, blockId) => {
    const file = e.target.files[0];
  
    if (!file) return; // If no file is selected, exit the function
  
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId && block.type === "TX Antenna"
          ? { ...block, settings: { ...block.settings, file } }
          : block
      )
    );
  
    if (selectedBlock && selectedBlock.id === blockId) {
      setSelectedBlock((prev) => ({
        ...prev,
        settings: { ...prev.settings, file },
      }));
    }

    console.log(`File uploaded to TX Antenna (ID: ${blockId}):`, file.name);

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
              position={{ x: block.x, y: block.y }} onStop={(e, data) => handleDrag(e, data, block)}>
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
                <label>Upload Message File:</label>
                <input type="file" onChange={(e) => handleTxFileUpload(e, selectedBlock.id)} />
                {selectedBlock.settings.file && <p>Selected File: {selectedBlock.settings.file.name}</p>}
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
            console.log("User logged in:", userEmail);

            if (ALLOWED_EMAILS.includes(userEmail)) {
                setUser(data.session.user);
            } else {
                console.warn("Unauthorized email:", userEmail);
                await supabase.auth.signOut();
                alert("Access denied. Your email is not authorized.");
            }
        } else {
            console.log("No active session. Waiting for login...");
        }
        setLoading(false);
    };

    fetchUser();
}, []);


  return loading ? <h2>Loading...</h2> : (
    <div>
      <div style={{ backgroundColor: "red", padding: "10px", textAlign: "center" }}>
        <h2>CACI GUI</h2>
        {user ? <p>✅ Logged in as {user.email}</p> : <GoogleLoginButton />}
      </div>
      {user ? <DraggableBlocks /> : null}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
reportWebVitals();
