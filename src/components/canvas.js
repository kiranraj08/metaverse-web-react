import React, { useRef, useEffect, useState } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import * as GUI from "babylonjs-gui";
import "../App.css";
// import * as cannon from "cannon";
import socketIO from "socket.io-client";
import { useHistory } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
const { REACT_APP_SERVER_DOMAIN, REACT_APP_ID } = process.env;

// window.CANNON = cannon;

const myStyle = {
  width: "100%",
  height: "100%",
  cursor: "none",
};

const ReactCanvas = (props) => {
  let history = useHistory();

  const [showPopUp, setShowPopUp] = useState(false);

  const handlePopUp = () => {
    setShowPopUp(true);
  };

  const handleLeave = () => {
    history.push("/");
  };
  let canvasRef = useRef(null);
  let canvas;
  let engine;
  let scene;
  let camera;

  let isWPressed = false;
  let isSPressed = false;
  let isAPressed = false;
  let isDPressed = false;
  let isBPressed = false;

  const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN, {
    extraHeaders: {
      "ngrok-skip-browser-warning": "any",
    },
  });

  // const socket = socketIO.connect(REACT_APP_SERVER_DOMAIN);
  const locRoom = localStorage.getItem("room");
  const locName = localStorage.getItem("name");

  // let data = {name:locRoom};
  // localStorage.clear();
  let GameData = {};
  let enemies = {};

  BABYLON.DefaultLoadingScreen.prototype.displayLoadingUI = function () {
    if (document.getElementById("customLoadingScreenDiv")) {
      // Do not add a loading screen if there is already one
      document.getElementById("customLoadingScreenDiv").style.display =
        "initial";
      return;
    }
    this._loadingDiv = document.createElement("div");

    this._loadingDiv.id = "customLoadingScreenDiv";
    this._loadingDiv.innerHTML =
      '<div class="lds-facebook"><div></div><div></div><div></div></div>';
    var customLoadingScreenCss = document.createElement("style");
    customLoadingScreenCss.type = "text/css";
    customLoadingScreenCss.innerHTML = `
    #customLoadingScreenDiv{
		
		background-image: linear-gradient(to right, #434343 0%, black 100%);
	
        color: white;
        font-size:50px;
        text-align:center;
		display:flex;
		justify-content:center;
		align-items:center;
    }
	.lds-facebook {
		display: inline-block;
		position: relative;
		width: 80px;
		height: 80px;
	  }
	  .lds-facebook div {
		display: inline-block;
		position: absolute;
		left: 8px;
		width: 16px;
		background: #fff;
		animation: lds-facebook 1.2s cubic-bezier(0, 0.5, 0.5, 1) infinite;
	  }
	  .lds-facebook div:nth-child(1) {
		left: 8px;
		animation-delay: -0.24s;
	  }
	  .lds-facebook div:nth-child(2) {
		left: 32px;
		animation-delay: -0.12s;
	  }
	  .lds-facebook div:nth-child(3) {
		left: 56px;
		animation-delay: 0;
	  }
	  @keyframes lds-facebook {
		0% {
		  top: 8px;
		  height: 64px;
		}
		50%, 100% {
		  top: 24px;
		  height: 32px;
		}
	  }
	  
	  
    `;
    document
      .getElementsByTagName("head")[0]
      .appendChild(customLoadingScreenCss);
    this._resizeLoadingUI();
    window.addEventListener("resize", this._resizeLoadingUI);
    document.body.appendChild(this._loadingDiv);
  };

  function connectToServer() {
    console.log("inside connect function");

    socket.on("connect", function () {
      console.log("connction estaplished successfully");

      socket.on("GetYourID", function (data) {
        GameData.id = data.id;
        GameData.name = locName;
        GameData.room = locRoom;
        socket.emit("ThankYou", GameData);
        // localStorage.clear();
      });

      socket.on("Start", function (Game) {
        const locAgoraExpiresAt = localStorage.getItem("agora-expiresAt");
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);

        if (!locAgoraExpiresAt || locAgoraExpiresAt < currentTimeInSeconds) {
          handleApi(Game.id);
        }
        startBasicCall();
        startGame(Game);
      });

      socket.on("AnotherTankCreated", function (Game, data) {
        if (locName != Game.name) {
          createGirl(scene, Game, data);
          // delayCreateScene(scene, Game, data);
        }
      });

      socket.on("AnotherTankMoved", function (data) {
        // console.log("aaaaaaaaaaaa",data);
        let girl = enemies[data.id];
        let hero = girl?.meshes[0];
        hero?.setState(data);
        const idleAnim = girl?.animationGroups[0];
        const sambaAnim = girl?.animationGroups[1];
        const walkAnim = girl?.animationGroups[2];
        const walkBackAnim = girl?.animationGroups[3];

        //Manage animations to be played
        if (data.notifyServer) {
          if (
            data.isWPressed ||
            data.isSPressed ||
            data.isAPressed ||
            data.isDPressed
          ) {
            walkAnim?.start(true, 1.0, walkAnim.from, walkAnim.to, false);
          }
        } else {
          //Default animation is idle when no key is down
          idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);
          hero.rotation = new BABYLON.Vector3(0, 9.5, 0);
          //Stop all animations besides Idle Anim when no key is down
          sambaAnim?.stop();
          walkAnim?.stop();
          walkBackAnim?.stop();
        }
      });

      // window.onbeforeunload = function () {
      //   socket.emit("IGoAway",locRoom, Game.id);
      //   socket.disconnect();
      // };

      socket.on("AnotherWentAway", function (data) {
        let hero = enemies[data.id].meshes[0];
        hero.dispose();
        delete enemies[data.id];
      });
    });
  }

  let options = {
    // Pass your App ID here.
    appId: REACT_APP_ID,
    // Set the channel name.
    channel: localStorage.getItem("room"),
    // Pass your temp token here.
    token: localStorage.getItem("agora-tocken"),
    // Set the user ID.
    uid: 0,
  };
  let channelParameters = {
    // A variable to hold a local audio track.
    localAudioTrack: null,
    // A variable to hold a remote audio track.
    remoteAudioTrack: null,
    // A variable to hold the remote user id.
    remoteUid: null,
  };
  async function startBasicCall() {
    // Create an instance of the Agora Engine
    const agoraEngine = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    // Listen for the "user-published" event to retrieve an AgoraRTCRemoteUser object.
    agoraEngine.on("user-published", async (user, mediaType) => {
      // Subscribe to the remote user when the SDK triggers the "user-published" event.
      await agoraEngine.subscribe(user, mediaType);
      console.log("subscribe success");
      // Subscribe and play the remote audio track.
      if (mediaType == "audio") {
        channelParameters.remoteUid = user.uid;
        // Get the RemoteAudioTrack object from the AgoraRTCRemoteUser object.
        channelParameters.remoteAudioTrack = user.audioTrack;
        // Play the remote audio track.
        channelParameters.remoteAudioTrack.play();
        showMessage("Remote user connected: " + user.uid);
      }
      // Listen for the "user-unpublished" event.
      agoraEngine.on("user-unpublished", (user) => {
        console.log(user.uid + "has left the channel");
        showMessage("Remote user has left the channel");
      });
    });
    const onLoad = async () => {
      // Listen to the Join button click event.
      // Join a channel.
      await agoraEngine.join(
        options.appId,
        options.channel,
        options.token,
        options.uid
      );
      showMessage("Joined channel: " + options.channel);
      // Create a local audio track from the microphone audio.
      channelParameters.localAudioTrack =
        await AgoraRTC.createMicrophoneAudioTrack();
      // Publish the local audio track in the channel.
      await agoraEngine.publish(channelParameters.localAudioTrack);
      console.log("Publish success!");
      // Listen to the Leave button click event.
      // document.getElementById('leave').onclick = async function ()
      // {
      //   // Destroy the local audio track.
      //   channelParameters.localAudioTrack.close();
      //   // Leave the channel
      //   await agoraEngine.leave();
      //   console.log("You left the channel");
      //   // Refresh the page for reuse
      //   window.location.reload();
      // }
    };
    onLoad();
  }
  function showMessage(text) {
    //   document.getElementById("message").textContent = text;
    console.log(" text----->", text);
  }

  async function startGame(Game) {
    canvas = canvasRef.current;
    engine = new BABYLON.Engine(canvas, true);
    engine.displayLoadingUI();
    scene = new BABYLON.Scene(engine);
    let girl = createScene(Game);
    let new_girl = await girl;
    // modifySettings();
    // let hero = scene.getMeshByName("__root__");
    // console.log("girl[0]", girl);
    // console.log("hero ", hero)
    // console.log("hero position ", hero._absolutePosition)
    // console.log("meshs", scene.meshes, scene.meshes.length)
    // scene.meshes.forEach(mesh => {
    // 	// console.log("mesh name", mesh)
    // 	// console.log("mesh position ", mesh._absolutePosition)
    // });
    let toRender = async function () {
      scene.render();
      await new_girl?.move();
    };
    engine.runRenderLoop(toRender);

    engine.hideLoadingUI();
    let element = document.getElementById("customLoadingScreenDiv");
    element.style.display = "none";
  }

  let createScene = async function (Game) {
    //************************ Uncomment this code if debug layer is needed */
    // scene.debugLayer.show({
    // 	embedMode: true
    // });

    //*********************************************************** */

    scene.collisionsEnabled = true;
    let light = createLights(scene);
    // let sky = createSkyBox(scene)
    let plain = CreateLand2();
    // let land1 = CreateLand1(scene);
    // let video = VideoPlay(scene)
    let spacialSound = spacial(scene);
    let hrdaEnv = Hdra(scene);

    let followCamera = createFollowCameralock(scene);
    camera = await followCamera;
    let new_plain = await plain;
    let new_light = await light;
    // let new_land1 = await land1;

    // let newSky = await sky;
    // let newVideo = await video;
    let newSpacial = await spacialSound;
    let newHdra = await hrdaEnv;
    let boy = delayCreateScene(scene, Game);
    // let girl = createGirl(scene, Game);
    let new_boy = await boy;
    // let new_girl = await girl;

    return new_boy;
  };

  const handleApi = (uId) => {
    const locRoomName = localStorage.getItem("room");
    // Simple POST request with a JSON body using fetch
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: locRoomName,
        uid: uId,
      }),
    };
    fetch(REACT_APP_SERVER_DOMAIN + "/get-token", requestOptions)
      .then((response) => response.json())
      .then((data) => {
        localStorage.setItem("agora-tocken", data.token);
        localStorage.setItem("agora-expiresAt", data.expiresAt);
      });
  };

  // function createRoomGUI(scene) {
  // 	var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  // 	var roomBTN = GUI.Button.CreateSimpleButton("but1", "Create Room");
  // 	roomBTN.width = "175px";
  // 	roomBTN.width = 0.2;
  // 	roomBTN.height = "40px";
  // 	roomBTN.cornerRadius = 20;
  // 	roomBTN.color = "Orange";
  // 	roomBTN.thickness = 4;
  // 	roomBTN.background = "green";
  // 	roomBTN.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  // 	roomBTN.onPointerUpObservable.add(function () {
  // 		let room = prompt("Room Name");
  // 		socket.emit("new-room", room);
  // 	});

  // 	advancedTexture.addControl(roomBTN);
  // }

  // async function ListRoomGUI(scene) {
  // 	const data = await fetch(REACT_APP_SERVER_DOMAIN)
  // 		.then((response) => response.json())
  // 		.then((data) => {
  // 			var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  // 			Object.keys(data.rooms).forEach((room) => {
  // 				var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  // 				var roomBTN = GUI.Button.CreateSimpleButton("but1", `Join ${room}`);
  // 				roomBTN.width = "175px";
  // 				roomBTN.width = 0.2;
  // 				roomBTN.height = "40px";
  // 				roomBTN.cornerRadius = 20;
  // 				roomBTN.color = "Orange";
  // 				roomBTN.thickness = 4;
  // 				roomBTN.background = "green";
  // 				roomBTN.horizontalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  // 				roomBTN.onPointerUpObservable.add(function () {
  // 					let name = prompt("Enter Your Name");
  // 					// socket.emit('new-user',room , name)
  // 				});
  // 				advancedTexture.addControl(roomBTN);
  // 			});
  // 		});
  // }

  async function Hdra(scene) {
    // scene.createDefaultEnvironment();
    // await new BABYLON.HDRCubeTexture("/texture-2.hdr", scene, 512)
    // const reflectionTexture = new BABYLON.HDRCubeTexture("environment.env", scene, 128, false, true, false, true);
    scene.environmentTexture = new BABYLON.CubeTexture(
      "assets/environment.env",
      scene
    );
    // Import the .env file as a CubeTexture
    const texture = new BABYLON.CubeTexture("tiltlsky.env", scene);
    // Create a skybox mesh using this texture
    const skybox = scene.createDefaultSkybox(texture, true, 10000, 0);
  }

  async function createFollowCameralock(scene) {
    let camera = await new BABYLON.ArcRotateCamera(
      "tankFollowCamera",
      5,
      1.48,
      10,
      new BABYLON.Vector3(-2, 0.2, 0.15),
      scene
    );
    camera.attachControl(canvas, true);
    camera.upperBetaLimit = BABYLON.Angle.FromDegrees(98).radians();
    camera.lowerBetaLimit = BABYLON.Angle.FromDegrees(35).radians();
    camera.lowerRadiusLimit = 0;
    camera.upperRadiusLimit = 20;
    // camera.checkCollisions = true;
    camera.inputs.remove(camera.inputs.attached.keyboard);
    // console.log("ssssssssssss",camera.collisionRadius);

    return camera;
  }

  async function VideoPlay(scene) {
    var planeOpts = {
      height: 3,
      width: 5,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    };
    var plane = BABYLON.MeshBuilder.CreatePlane("plane", planeOpts, scene);
    // let board = await BABYLON.SceneLoader.ImportMeshAsync("", "/assets/", "Videoboard.glb", scene);

    let board = new BABYLON.SceneLoader.ImportMesh(
      "",
      "/assets/",
      "Videoboard.glb",
      scene,
      (meshes) => {
        meshes.forEach((i) => {
          i.position.y = -18;
          i.position.x = 26;
          i.position.z = 18;
          i.rotation.y = Math.PI / 2;
        });
      }
    );

    plane.position.y = 6.2;
    plane.position.x = 12.25;
    plane.position.z = 27.2;
    plane.rotation.y = Math.PI;
    plane.scaling.x = 3.6;
    plane.scaling.y = 3;
    plane.scaling.z = 1;

    var mat = new BABYLON.StandardMaterial("mat", scene);

    var videoTexture = new BABYLON.VideoTexture(
      "video",
      ["textures/babylonjs.mp4", "textures/babylonjs.webm"],
      scene,
      false,
      false,
      BABYLON.VideoTexture.TRILINEAR_SAMPLINGMODE,
      {
        autoPlay: true,
        loop: true,
        autoUpdateTexture: true,
        muted: true,
      }
    );

    mat.diffuseTexture = videoTexture;
    mat.diffuseTexture.uScale = -1;
    plane.material = mat;
    let clicked = false;
    plane.actionManager = new BABYLON.ActionManager(scene);
    plane.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
        if (clicked) {
          clicked = false;
          videoTexture.video.play();
        } else {
          videoTexture.video.pause();
          clicked = true;
        }
      })
    );

    if (clicked == false) {
      clicked = true;
      videoTexture.video.play();
    }
  }
  async function CreateLand1(scene) {
    const land1 = await BABYLON.SceneLoader.ImportMesh(
      "",
      "/assets/",
      "Ground.glb",
      scene,
      (meshes) => {
        // var wall = scene.getMeshById("Blockable");

        // wall.isVisible = false;

        const arraysea = ["Sea 1", "Sea-2", "Seas-3"];

        console.log(meshes, "land");
        meshes.map((i) => {
          i.checkCollisions = true;
        });
      }
    );

    return land1;
  }

  async function CreateLand2() {
    const land2 = BABYLON.MeshBuilder.CreateGround("ground", {
      height: 151.5,
      width: 134,
      subdivisions: 4,
    });
    land2.checkCollisions = true;

    return land2;
  }

  async function createLights(scene) {
    var light = await new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(-1, 1, 0),
      scene
    );
  }

  async function createSkyBox(scene) {
    var skybox = BABYLON.CreateBox(
      "skyBox",
      { width: 134, height: 100, depth: 151.5 },
      scene
    );
    skybox.position.x = -1.5;
    skybox.position.z = -9.5;

    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;

    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
      "textures/skybox/skybox",
      scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode =
      BABYLON.Texture.SKYBOX_MODE;

    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);

    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
    skybox.checkCollisions = true;
    skybox.actionManager = new BABYLON.ActionManager(scene);
    //ON MOUSE ENTER
    skybox.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        function (ev) {
          scene.hoverCursor = "grab";
        }
      )
    );
  }

  async function spacial(scene) {
    var music1 = new BABYLON.Sound(
      "Violons11",
      "sounds/spacial.wav",
      scene,
      null,
      { loop: true, autoplay: true, spatialSound: true, maxDistance: 25 }
    );
    music1.setPosition(new BABYLON.Vector3(12, 0, 27));
  }

  async function makeThumbArea(name, thickness, color, background, curves) {
    let rect = new GUI.Ellipse();
    rect.name = name;
    rect.thickness = thickness;
    rect.color = color;
    rect.background = background;
    rect.paddingLeft = "0px";
    rect.paddingRight = "0px";
    rect.paddingTop = "0px";
    rect.paddingBottom = "0px";

    return rect;
  }

  var delayCreateScene = async function (scene, Game) {
    const baseUrl = "https://thomlucc.github.io/Assets/AvatarDemo/";

    let inputMap = {};
    scene.actionManager = await new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyDownTrigger,
        function (evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyUpTrigger,
        function (evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );

    let avatarUrl = localStorage.getItem("avatarUrl");
    let girl = await BABYLON.SceneLoader.LoadAssetContainerAsync(
      avatarUrl,
      "",
      scene
    );
    girl.meshes.map((mesh) => {
      mesh.checkCollisions = true;
    });
    girl.addAllToScene();
    let hero = girl.meshes[0];
    console.log(hero, "newdfjfkdjsfkldjsfkljsdffffffff");

    hero.scaling.scaleInPlace(1.8);
    hero.position.y = 2.4;
    hero.position.x = -5;

    hero.ellipsoid = new BABYLON.Vector3(0.01, 0.02, 0.01);

    hero.state = {
      id: Game.id,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      isSPressed: false,
      isAPressed: false,
      isDPressed: false,
      isWPressed: false,
      isBPressed: false,
    };

    hero.setState = function (data) {
      hero.position.x = data.x;
      hero.position.y = data.y;
      hero.position.z = data.z;
      if (data.isAPressed || data.isDPressed) {
        hero.rotate(BABYLON.Vector3.Up(), data.r);
      }
    };

    let advancedTexture1 = GUI.AdvancedDynamicTexture.CreateFullscreenUI(
      "GUI1",
      true,
      scene
    );
    let loadedGUI = await advancedTexture1.parseFromSnippetAsync("ZXCA4C");

    advancedTexture1
      .getControlByName("Speaker Checkbox")
      .onIsCheckedChangedObservable.add(function (value) {
        if (!value) {
          console.log("Speaker on");
          channelParameters?.remoteAudioTrack?.play();
          // channelParameters.localAudioTrack.close();
        } else {
          console.log("Speaker off");
          channelParameters?.remoteAudioTrack?.stop();
        }
      });

    advancedTexture1
      .getControlByName("Mic Checkbox")
      .onIsCheckedChangedObservable.add(function (value) {
        if (!value) {
          console.log("Mic on");
          channelParameters?.localAudioTrack?.setMuted(false);
        } else {
          console.log("Mic off");
          channelParameters?.localAudioTrack?.setMuted(true);
        }
      });

    let text = advancedTexture1.getControlByName("Name Textblock");
    text._text = Game.name;
    var plane = BABYLON.Mesh.CreatePlane("plane", 0.1);
    plane.parent = hero;
    plane.position.y = 1.8;
    camera.target = plane;
    plane.setEnabled(false);

    socket.emit("IWasCreated", GameData, hero.state);

    scene.onPointerPick = function (evt, pickInfo) {
      var newarry = [
        "Floor",
        "Floor 1",
        "Floor 2",
        "floor 3",
        "Floor 4",
        "Floor 5",
        "Floor6",
        "Floor 7",
      ];

      console.log("pickedMesh", pickInfo?.pickedMesh.id);
      if (newarry.includes(pickInfo?.pickedMesh.id)) {
        hero.position.x = pickInfo.pickedPoint.x;
        hero.position.z = pickInfo.pickedPoint.z;
        hero.position.y = pickInfo.pickedPoint.y + 0.05;
      }
    };

    BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce((loader) => {
      loader.animationStartMode = BABYLON.GLTFLoaderAnimationStartMode?.NONE;
    });

    BABYLON.SceneLoader.ImportAnimations(
      "assets/movements/",
      "Walking.glb",
      scene,
      false,
      BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean,
      null
    );

    BABYLON.SceneLoader.ImportAnimations(
      "assets/movements/",
      "Idle.glb",
      scene,
      false,
      BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean,
      null
    );

    BABYLON.SceneLoader.ImportAnimations(
      "assets/movements/",
      "dance.glb",
      scene,
      false,
      BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean,
      null
    );

    BABYLON.SceneLoader.ImportAnimations(
      "assets/movements/",
      "WalkBack.glb",
      scene,
      false,
      BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean,
      null
    );

    BABYLON.SceneLoader.ImportAnimations(
      "assets/movements/",
      "jumping.glb",
      scene,
      false,
      BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean,
      null
    );

    hero.move = async function () {
      let heroSpeed = 0.15;
      let heroSpeedBackwards = 0.025;
      let heroRotationSpeed = 0.1;
      const gravity = new BABYLON.Vector3(0, -0.2, 0);
      let curGroupAnim;
      let notifyServer = false;
      hero.state.notifyServer = false;
      //   if (hero.position.y > 2) {
      //     hero.moveWithCollisions(new BABYLON.Vector3(0, -2, 0));
      //     notifyServer = true;
      //   }
      if (isWPressed) {
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 1.6, 0);
        const vec = hero.forward.scale(heroSpeed).add(gravity);
        hero.moveWithCollisions(vec);
        curGroupAnim = scene.animationGroups[0];
        curGroupAnim.play(true);
        // scene.animationsEnabled= true
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isSPressed) {
        // jumping?.start(true, 1.0, jumping._from, jumping._to, false);
        // hero.rotation = new BABYLON.Vector3(0, -camera.alpha - 1.4, 0);
        const vec = hero.forward.scale(-heroSpeedBackwards).add(gravity);
        hero.moveWithCollisions(vec);
        curGroupAnim = scene.animationGroups[0];
        curGroupAnim.play(true);
        // scene.animationsEnabled= true
        // BABYLON.SceneLoader.ImportAnimations("://raw.githhttpsubusercontent.com/Gopakumar9633/new/master/", "Anim01.glb", scene, false, BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean, null);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isAPressed) {
        // hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 0.5, 0);
        hero.state.r = -heroRotationSpeed;
        hero.rotate(BABYLON.Vector3.Up(), -heroRotationSpeed);
        hero.frontVector = new BABYLON.Vector3(
          Math.sin(hero?.rotation.y),
          0,
          Math.cos(hero?.rotation.y)
        );
        notifyServer = true;
      }
      if (isDPressed) {
        // hero.rotation = new BABYLON.Vector3(0, -camera.alpha - 3.5, 0);
        hero.state.r = heroRotationSpeed;
        hero.rotate(BABYLON.Vector3.Up(), heroRotationSpeed);
        hero.frontVector = new BABYLON.Vector3(
          Math.sin(hero?.rotation?.y),
          0,
          Math.cos(hero?.rotation?.y)
        );
        notifyServer = true;
      }
      if (isBPressed) {
        // curGroupAnim = scene.animationGroups[4];
        curGroupAnim.play(true);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (notifyServer) {
        hero.state.x = hero.position.x;
        hero.state.y = hero.position.y;
        hero.state.z = hero.position.z;
        hero.state.isSPressed = isSPressed;
        hero.state.isAPressed = isAPressed;
        hero.state.isDPressed = isDPressed;
        hero.state.isWPressed = isWPressed;
        hero.state.isBPressed = isBPressed;
      } else {
        hero.state.isSPressed = false;
        hero.state.isAPressed = false;
        hero.state.isDPressed = false;
        hero.state.isWPressed = false;
        hero.state.isBPressed = false;
        const curGroupAnim = scene.animationGroups[0];
        const curGroupAnim1 = scene.animationGroups[1];
        const curGroupAnim2 = scene.animationGroups[2];
        // const curGroupAnim3 = scene.animationGroups[3];
        // const curGroupAnim4 = scene.animationGroups[4];
        curGroupAnim?.stop();
        curGroupAnim2?.stop();
        // curGroupAnim3?.stop();
        // curGroupAnim4?.stop();
        curGroupAnim1?.play(true);
        // hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 1.6, 0);
        // dancing?.stop();
        // jumping?.stop();
        // BABYLON.SceneLoader.ImportAnimations("assets/movements/", "idle.glb", scene, false, BABYLON.SceneLoaderAnimationGroupLoadingMode.Clean, null);
        // idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);
        //Stop all animations besides Idle Anim when no key is down
        // sambaAnim?.stop();
        // walkAnim?.stop();
        // walkBackAnim?.stop();
        hero.state.notifyServer = false;
        // scene.animationsEnabled= false
      }
      socket.emit("IMoved", Game, hero.state);
    };

    function vecToLocal(vector, mesh) {
      var m = mesh.getWorldMatrix();
      var v = BABYLON.Vector3.TransformCoordinates(vector, m);
      return v;
    }

    function stepCastRay() {
      var origin = hero.position;

      var forward = new BABYLON.Vector3(0, 0, 1);
      forward = vecToLocal(forward, hero);

      var direction = forward.subtract(origin);
      direction = BABYLON.Vector3.Normalize(direction);

      var length = 1;

      var ray = new BABYLON.Ray(origin, direction, length);

      var hit = scene.pickWithRay(ray);

      if (hit.pickedMesh && hit.distance < 0.5) {
        hero.position.y += 0.4;
      }
    }

    scene.registerBeforeRender(function () {
      stepCastRay();
    });

    const binding = await new Promise((resolve) => {
      scene.executeWhenReady(() => {
        engine.snapshotRendering = false;
        scene.onBeforeRenderObservable.add(() => {
          scene.skeletons.forEach((skeleton) => skeleton.prepare());
        });
        resolve(scene);
      });
    });

    return hero;
  };

  async function createGirl(scene, Game, data) {
    let inputMap = {};
    scene.actionManager = await new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyDownTrigger,
        function (evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyUpTrigger,
        function (evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );

    let avatarUrl = localStorage.getItem("avatarUrl");
    let girl = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      avatarUrl,
      "",
      scene
    );
    console.log(girl, "girl");
    girl.meshes.map((element) => {
      element.checkCollisions = true;
    });
    let hero = girl.meshes[0];

    hero.scaling.scaleInPlace(2);
    hero.position.y = 2.4;
    hero.position.x = -5;

    const idleAnim = girl.animationGroups[2];
    const sambaAnim = girl.animationGroups[0];
    const walkAnim = girl.animationGroups[1];
    const walkBackAnim = girl.animationGroups[3];
    console.log(sambaAnim, "sambaAnim");
    console.log(walkAnim, "walkAnim");

    hero.ellipsoid = new BABYLON.Vector3(0.01, 0.02, 0.01);
    hero.state = {
      id: Game.id,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      isSPressed: false,
      isAPressed: false,
      isDPressed: false,
      isWPressed: false,
      isBPressed: false,
    };
    hero.setState = function (data) {
      hero.position.x = data.x;
      hero.position.y = data.y;
      hero.position.z = data.z;
      if (data.isAPressed || data.isDPressed) {
        hero.rotate(BABYLON.Vector3.Up(), data.r);
      }
    };

    if (data) {
      enemies[data.id] = girl;
      hero.setState(data);

      // --------------------- GUI BUTTON BOX -------------------------------
      var plane = BABYLON.Mesh.CreatePlane("plane", 5);
      plane.parent = hero;
      plane.position.y = 25;
      // var advancedTexture = new BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(
      //   plane
      // );
      var advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(plane);
      var textblock = new GUI.TextBlock();
      textblock.text = data.Game.name;
      textblock.fontSize = 300;
      textblock.color = "white";
      advancedTexture.addControl(textblock);
      // --------------------- GUI BUTTON BOX -------------------------------
    } else {
      // Load a GUI from the snippet server.
      // https://gui.babylonjs.com/#ZXCA4C
      // http://grideasy.github.io/overviews/Gui

      let advancedTexture1 = GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "GUI1",
        true,
        scene
      );
      let loadedGUI = await advancedTexture1.parseFromSnippetAsync("ZXCA4C");

      advancedTexture1
        .getControlByName("Speaker Checkbox")
        .onIsCheckedChangedObservable.add(function (value) {
          if (!value) {
            console.log("Speaker on");
            channelParameters?.remoteAudioTrack?.play();
            // channelParameters.localAudioTrack.close();
          } else {
            console.log("Speaker off");
            channelParameters?.remoteAudioTrack?.stop();
          }
        });

      advancedTexture1
        .getControlByName("Mic Checkbox")
        .onIsCheckedChangedObservable.add(function (value) {
          if (!value) {
            console.log("Mic on");
            channelParameters?.localAudioTrack?.setMuted(false);
          } else {
            console.log("Mic off");
            channelParameters?.localAudioTrack?.setMuted(true);
          }
        });

      let text = advancedTexture1.getControlByName("Name Textblock");
      text._text = Game.name;

      // ---------------To change the camera position to the girl's head ------------
      var plane = BABYLON.Mesh.CreatePlane("plane", 5);
      plane.parent = hero;
      plane.position.y = 27;
      camera.target = hero;
      plane.setEnabled(false);
      // ---------------To change the camera position to the girl's head ------------

      socket.emit("IWasCreated", GameData, hero.state);

      scene.onPointerPick = function (evt, pickInfo) {
        var newarry = [
          "Floor",
          "Floor 1",
          "Floor 2",
          "Floor3",
          "Floor 4",
          "Floor 5",
          "Floor6",
          "Floor 7",
        ];

        console.log("pickedMesh", pickInfo?.pickedMesh.id);
        if (newarry.includes(pickInfo?.pickedMesh.id)) {
          hero.position.x = pickInfo.pickedPoint.x;
          hero.position.z = pickInfo.pickedPoint.z;
          hero.position.y = pickInfo.pickedPoint.y + 0.05;
        }
      };
    }

    hero.move = async function () {
      let heroSpeed = 0.15;
      let heroSpeedBackwards = 0.15;
      let heroRotationSpeed = 0.15;
      const gravity = new BABYLON.Vector3(0, -0.2, 0);

      let notifyServer = false;
      hero.state.notifyServer = false;

      if (isWPressed) {
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 1.6, 0);
        const vec = hero.forward.scale(heroSpeed).add(gravity);
        console.log(vec, "vec");
        hero.moveWithCollisions(vec);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isSPressed) {
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha - 1.4, 0);
        const vec = hero.forward.scale(heroSpeedBackwards).add(gravity);
        hero.moveWithCollisions(vec);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isAPressed) {
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 0.5, 0);
        const vec = hero.forward.scale(heroSpeedBackwards).add(gravity);
        hero.moveWithCollisions(vec);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isDPressed) {
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha - 3.5, 0);
        const vec = hero.forward.scale(heroSpeedBackwards).add(gravity);
        hero.moveWithCollisions(vec);
        notifyServer = true;
        hero.state.notifyServer = true;
      }
      if (isBPressed) {
        notifyServer = true;
        hero.state.notifyServer = true;
      }

      if (notifyServer) {
        hero.state.x = hero.position.x;
        hero.state.y = hero.position.y;
        hero.state.z = hero.position.z;
        hero.state.isSPressed = isSPressed;
        hero.state.isAPressed = isAPressed;
        hero.state.isDPressed = isDPressed;
        hero.state.isWPressed = isWPressed;
        hero.state.isBPressed = isBPressed;
      } else {
        hero.state.isSPressed = false;
        hero.state.isAPressed = false;
        hero.state.isDPressed = false;
        hero.state.isWPressed = false;
        hero.state.isBPressed = false;
        hero.rotation = new BABYLON.Vector3(0, -camera.alpha + 1.6, 0);
        idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);
        //Stop all animations besides Idle Anim when no key is down
        sambaAnim?.stop();
        walkAnim?.stop();
        walkBackAnim?.stop();
        hero.state.notifyServer = false;
      }
      // console.log("aaaaaaaaaaaa", hero._absolutePosition);
      socket.emit("IMoved", Game, hero.state);
    };

    function vecToLocal(vector, mesh) {
      var m = mesh.getWorldMatrix();
      var v = BABYLON.Vector3.TransformCoordinates(vector, m);
      return v;
    }

    function stepCastRay() {
      var origin = hero.position;

      var forward = new BABYLON.Vector3(0, 0, 1);
      forward = vecToLocal(forward, hero);

      var direction = forward.subtract(origin);
      direction = BABYLON.Vector3.Normalize(direction);

      var length = 1;

      var ray = new BABYLON.Ray(origin, direction, length);

      // let rayHelper = new BABYLON.RayHelper(ray);
      // rayHelper.show(scene);

      var hit = scene.pickWithRay(ray);
      // console.log(hit,"hit")

      if (hit.pickedMesh && hit.distance < 0.5) {
        hero.position.y += 0.4;
      }
    }

    function underwaterRayCast() {
      var origin = hero.position;

      var downward = new BABYLON.Vector3(0, -1, 0);
      downward = vecToLocal(downward, hero);

      var direction = downward.subtract(origin);
      direction = BABYLON.Vector3.Normalize(direction);

      var length = 2;

      var ray = new BABYLON.Ray(origin, direction, length);

      var hit = scene.pickWithRay(ray);
      console.log(hit, "hit");

      if (hit.pickedMesh?.id == "Sea-2" || it.pickedMesh?.id == "Sea-2") {
        hero.position.y -= 0.3;
        return;
      }
    }

    scene.registerBeforeRender(function () {
      stepCastRay();
      // underwaterRayCast();
    });

    return hero;
  }

  window.addEventListener("resize", function () {
    engine?.resize();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
      isWPressed = true;
    }
    if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
      isSPressed = true;
    }
    if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
      isAPressed = true;
    }
    if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") {
      isDPressed = true;
    }
    if (event.key === "b" || event.key === "B") {
      isBPressed = true;
    }
  });

  document.addEventListener("keyup", function (event) {
    if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
      isWPressed = false;
    }
    if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
      isSPressed = false;
    }
    if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
      isAPressed = false;
    }
    if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") {
      isDPressed = false;
    }
    if (event.key === "b" || event.key === "B") {
      isBPressed = false;
    }
  });

  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("inside useeffect");
    connectToServer();
  }, []);

  return (
    <div>
      {showPopUp && (
        <div className="leave">
          <div className="next">
            <div className="nextdiv">
              <h1 className="nextdivheading">Are you sure want to Leave</h1>
            </div>
            <div className="buttondiv">
              <button
                className="buttondivcancel"
                onClick={() => setShowPopUp(false)}
              >
                CANCEL
              </button>
              <button className="buttondivleave" onClick={() => handleLeave()}>
                LEAVE
              </button>
            </div>
          </div>
        </div>
      )}
      <button className="buttonsvg" onClick={() => handlePopUp()}>
        <span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            enableBackground="new 0 0 24 24"
            height="24px"
            viewBox="0 0 24 24"
            width="24px"
            fill="currentColor"
            style={{ transform: "scale(-1, 1)" }}
          >
            <g>
              <path d="M0,0h24v24H0V0z" fill="none"></path>
            </g>
            <g>
              <path d="M17,8l-1.41,1.41L17.17,11H9v2h8.17l-1.58,1.58L17,16l4-4L17,8z M5,5h7V3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h7v-2H5V5z"></path>
            </g>
          </svg>
        </span>
        <span style={{ paddingTop: "7px" }}>LEAVE</span>
      </button>
      <canvas style={myStyle} ref={canvasRef} {...props}></canvas>
    </div>
  );
};
export default ReactCanvas;
