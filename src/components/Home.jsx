import React, { useState } from "react";
import { useHistory, Link } from "react-router-dom";
import "../App.css";

const Home = (props) => {
  return (
    <div className="outerHome">
      <div className="landingpage-container">
        <div className="herodivhome">
          <h1 className="heading">Welcome to Metaverse</h1>
          <p className="para">WebGl MetaWorld</p>
          <button className="herobutton">
            <a href="/readyplayerme">Enter the Metaverse</a>
          </button>
        </div>
      </div>
    </div>
  );
};
export default Home;
