import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import socketIO from "socket.io-client";
const { REACT_APP_SERVER_DOMAIN } = process.env;

const IO = socketIO.connect(REACT_APP_SERVER_DOMAIN, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "any",
  },
});

const LandingPage = (props) => {
  const history = useHistory();
  const [value, setValue] = useState("");
  const [rooms, setRooms] = useState([]);
  const [createRooms, setCreateRooms] = useState(false);
  const [name, setName] = useState("");
  const socket = props.socket;

  const handleRoom = (value) => {
    props.setRoom(value);
    socket.emit("new-room", value);
  };

  const getRooms = () => {
    IO.emit("init");
    IO.on("get-rooms", (rooms) => {
      setRooms(Object.keys(rooms));
    });
    return rooms;
  };

  IO.on("room-added", (rooms) => {
    setRooms(Object.keys(rooms));
  });

  const handleName = (room, name) => {
    localStorage.setItem("room", room);
    localStorage.setItem("name", name);
    socket.disconnect();
    IO.disconnect();
    history.push(`/${room}`);
  };

  return (
    <div className="outer">
      <div className="landingpage-container">
        <div className="herodiv">
          <h1 className="heading">Welcome to Metaverse</h1>
          <p className="para">WebGl MetaWorld</p>
        </div>
        <div className="room-container1">
          <h3 className="room">Create Room</h3>
          <div className="room-container">
            <form>
              {!createRooms && (
                <button
                  className="button"
                  onClick={() => {
                    setCreateRooms(true);
                  }}
                >
                  Create Room{" "}
                </button>
              )}
              {createRooms && (
                <input
                  type="text"
                  onChange={(e) => {
                    setValue(e.target.value);
                  }}
                  placeholder="Enter Room Name"
                  className="input"
                ></input>
              )}

              {createRooms && (
                <button
                  className="button"
                  type="submit"
                  onClick={() => handleRoom(value)}
                >
                  Create
                </button>
              )}
            </form>
          </div>

          {getRooms().length > 0 && (
            <>
              <h3 className="room">Join Room</h3>
              <input
                type="text"
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="Enter Your Name"
                className="input"
              ></input>
            </>
          )}

          {rooms.map((room, index) => (
            <form key={index}>
              <div>
                <button
                  className="button"
                  type="submit"
                  onClick={() => handleName(room, name)}
                >
                  {" "}
                  {room}
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
};
export default LandingPage;
