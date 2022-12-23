import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import { useHistory } from "react-router-dom";

const ReadyPlayerMe = () => {
  let history = useHistory();
  const subdomain = "tiltverse";
  const iFrameRef = useRef(null);

  useEffect(() => {
    let iFrame = iFrameRef.current;
    if (iFrame) {
      iFrame.src = `https://${subdomain}.readyplayer.me/avatar?frameApi`;
    }
  });
  useEffect(() => {
    window.addEventListener("message", subscribe);
    document.addEventListener("message", subscribe);
    return () => {
      window.removeEventListener("message", subscribe);
      document.removeEventListener("message", subscribe);
    };
  });

  function subscribe(event) {
    const json = parse(event);
    if (json?.source !== "readyplayerme") {
      return;
    }
    if (json.eventName === "v1.frame.ready") {
      let iFrame = iFrameRef.current;
      if (iFrame && iFrame.contentWindow) {
        iFrame.contentWindow.postMessage(
          JSON.stringify({
            target: "readyplayerme",
            type: "subscribe",
            eventName: "v1.**",
          }),
          "*"
        );
      }
    }

    if (json.eventName === "v1.avatar.exported") {
      console.log(`Avatar URL: ${json.data.url}`);
      localStorage.setItem("avatarUrl", json.data.url);
      history.push("/landing");
    }

    if (json.eventName === "v1.user.set") {
      console.log(`User with id ${json.data.id} set:
${JSON.stringify(json)}`);
    }
  }
  function parse(event) {
    try {
      return JSON.parse(event.data);
    } catch (error) {
      return null;
    }
  }

  return (
    <div className="readyplayer">
      <iframe
        allow="camera *; microphone *"
        className="iFrame"
        id="frame"
        ref={iFrameRef}
        title={"Ready Player Me"}
      />
    </div>
  );
};

export default ReadyPlayerMe;
