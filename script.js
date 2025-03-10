if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
const ws = new WebSocket('wss://demo.vicharak.in:8383');
const roomName = roomHash;
const configuration = {
  iceServers: [{ urls: 'stun:194.233.91.191:3478' }]
};
let pc;

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'join', room: roomName }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'joined':
      console.log('A peer has joined the room');
      startWebRTC(true);
      break;

    case 'signal':
      handleSignalingData(message.data);
      break;

    default:
      console.error('Unknown message type:', message.type);
  }
};

function sendMessage(message) {
  ws.send(JSON.stringify({ type: 'signal', room: roomName, data: message }));
}

function startWebRTC(isOfferer) {
  pc = new RTCPeerConnection(configuration);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({ candidate: event.candidate });
    }
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    localVideo.srcObject = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }).catch(console.error);

  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then((desc) => {
        pc.setLocalDescription(desc);
        sendMessage({ sdp: desc });
      }).catch(console.error);
    };
  }
}

function handleSignalingData(data) {
  if (data.sdp) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
      if (pc.remoteDescription.type === 'offer') {
        pc.createAnswer().then((desc) => {
          pc.setLocalDescription(desc);
          sendMessage({ sdp: desc });
        }).catch(console.error);
      }
    }).catch(console.error);
  } else if (data.candidate) {
    pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
  }
}
