const app = require('express')();
const cors = require('cors');
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
      // origin: "http://localhost:3000",
      origin: "*"
    }
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('<h1>Hey Socket.io</h1>');
});

const jwt = require('jsonwebtoken');

// jwt secret
const JWT_SECRET = 'myRandomHash';


io.use(async (socket, next) => {
  // fetch token from handshake auth sent by FE
  const user = socket.handshake.auth.user;
  const payload = { user: user };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h'});
  try {
    // verify jwt token and get user data
    const user = await jwt.verify(token, JWT_SECRET);

    // save the user data into socket object, to be used further
    socket.user = user;
    next();
  } catch (e) {
    // if token is invalid, close connection
    console.log('error', e.message);
    return next(new Error(e.message));
  }
});

io.on("connection", (socket) => {
  // join user's own room
  socket.join(socket.user.user);
  console.log("a user connected:", socket.user.user);
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("my broadcast", `server: ${msg}`);
  });

  socket.on("join", (roomName) => {
    console.log("join: " + roomName);
    socket.join(roomName);
  });

  socket.join('myRandomChatRoomId');

  socket.on("message", ({ message, roomName }) => {
    console.log("message: " + message + " in " + roomName);
    const d = new Date();
    var theTime = d.toLocaleTimeString();

    // generate data to send to receivers
    const outgoingMessage = {
        name: socket.user.user,
        id: '123',
        message,
        time: theTime.slice(0, 5)
    };

    // send to all including sender
    io.to(roomName).emit("message", outgoingMessage);
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
