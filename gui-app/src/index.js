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

  const handleFileChange = (e) => {
    if (selectedBlock) {
      const file = e.target.files[0];
      setSelectedBlock({
        ...selectedBlock,
        settings: { ...selectedBlock.settings, file },
      });
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
              position={{ x: block.x, y: block.y }} onStop={(e, data) => handleDrag(e, data, block)}>
              <div ref={block.nodeRef} className="block" onClick={() => handleClick(block)}>
                <div className="block-image">{block.type}</div>
              </div>
            </Draggable>
          ))}
        </div>
      </div>

      <div className="info-panel">
        <div className="info-box">
          {selectedBlock ? (
            <>
              <h3>{selectedBlock.type} Settings</h3>
              <label>Power Level:</label>
              <input type="number" value={selectedBlock.settings.power} />
              <br />
              <label>Battery Level:</label>
              <input type="number" value={selectedBlock.settings.battery} />
              <br />
              <label>Bandwidth:</label>
              <input type="number" value={selectedBlock.settings.bandwidth} />
              <br />
              <label>Message:</label>
              <input type="text" value={selectedBlock.settings.message} />
              <br />
              <label>Upload Message File:</label>
              <input type="file" onChange={handleFileChange} />
            </>
          ) : (
            <div>
              <h3>Select a Block</h3>
              <p>Click on a block to configure settings.</p>
            </div>
          )}
        </div>

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
