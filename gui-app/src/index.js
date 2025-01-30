import React, { useState, createRef } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";

const DraggableBlocks = () => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null); // State to track the selected block for info display
  const [connections, setConnections] = useState([]); // State to track connections between blocks

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      nodeRef: createRef(),
      x: 100, // Starting position X
      y: 100, // Starting position Y
    };
    setBlocks([...blocks, newBlock]);
  };

  const handleClick = (id, type) => {
    if (selectedBlock) {
      // Create a connection if another block is already selected
      setConnections([
        ...connections,
        { from: selectedBlock.id, to: id }
      ]);
      setSelectedBlock(null); // Reset selected block after making a connection
    } else {
      // Set the selected block to display the information in the side panel
      setSelectedBlock({ id, type });
    }
  };

  const handleDragStop = (e, data, id) => {
    const updatedBlocks = blocks.map((block) =>
      block.id === id ? { ...block, x: data.x, y: data.y } : block
    );
    setBlocks(updatedBlocks);
  };

  const getBlockPosition = (id) => {
    const block = blocks.find((block) => block.id === id);
    return block ? { x: block.x + 50, y: block.y + 50 } : { x: 0, y: 0 }; // Adjust to center of block
  };

  return (
    <div className="container">
      <div className="draggable-container">
        <div className="button-container">
          <button className="button" onClick={() => addBlock("RX Antenna")}>
            Add RX Antenna
          </button>
          <button className="button" onClick={() => addBlock("TX Antenna")}>
            Add TX Antenna
          </button>
          <button className="button" onClick={() => addBlock("Relay")}>
            Add Relay
          </button>
        </div>

        <svg className="connection-lines">
          {/* Render connections */}
          {connections.map((connection, index) => {
            const fromPosition = getBlockPosition(connection.from);
            const toPosition = getBlockPosition(connection.to);
            return (
              <line
                key={index}
                x1={fromPosition.x} // Adjust for center of block
                y1={fromPosition.y} // Adjust for center of block
                x2={toPosition.x} // Adjust for center of block
                y2={toPosition.y} // Adjust for center of block
                stroke="black"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {blocks.map((block) => (
          <Draggable
            key={block.id}
            nodeRef={block.nodeRef}
            defaultPosition={{ x: block.x, y: block.y }}
            onStop={(e, data) => handleDragStop(e, data, block.id)}
          >
            <div
              ref={block.nodeRef}
              className="block"
              onClick={() => handleClick(block.id, block.type)}
            >
              {block.type}
            </div>
          </Draggable>
        ))}
      </div>

      <div className="info-panel">
        {selectedBlock ? (
          <div className="info-box">
            <h3>Block Information</h3>
            <p><strong>Type:</strong> {selectedBlock.type}</p>
            <p><strong>ID:</strong> {selectedBlock.id}</p>
          </div>
        ) : (
          <div className="info-box">
            <h3>Select a Block</h3>
            <p>Click on a block to see more information or connect it to another block.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableBlocks;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <DraggableBlocks />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();



