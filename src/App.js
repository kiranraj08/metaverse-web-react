import { useEffect, useState } from "react";
import socketIO from "socket.io-client";
import Scene from "./components/canvas";
import LandingPage from "./components/landing-page";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import Home from "./components/Home";
import ReadyPlayerMe from "./components/Readyplayerme";
const { REACT_APP_SERVER_DOMAIN } = process.env;

function App() {
  const [room, setRoom] = useState("");
  const [socket, setSocket] = useState("");
  const [roomOne, setRoomOne] = useState([]);

  useEffect(() => {
    const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN, {
      extraHeaders: {
        "ngrok-skip-browser-warning": "any",
      },
      transports: ["websocket"],
    });
    // const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN, { transports: ["websocket"] });
    setSocket(socket);
    socket.emit("init");
    socket.on("get-rooms", (rooms) => {
      setRoomOne(Object.keys(rooms));
    });
  }, []);
  return (
    <div className="App">
      <BrowserRouter>
        <Switch>
          <Route exact path="/">
            {/* <LandingPage socket={socket} setRoom={(room) => setRoom(room)} />{" "} */}
            <Home />
          </Route>
          <Route exact path="/readyplayerme">
            <ReadyPlayerMe />
          </Route>
          <Route exact path="/landing">
            <LandingPage socket={socket} setRoom={(room) => setRoom(room)} />{" "}
          </Route>
          {roomOne.map((item, index) => (
            <Route key={index} path={`/:${item}`}>
              <Scene room={room} />{" "}
            </Route>
          ))}
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
