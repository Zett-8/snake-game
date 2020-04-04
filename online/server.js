const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

const PORT = 8008

const rooms = {

}

app.use(express.static(__dirname + '/'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

app.get('/:room', (req, res) => {
  res.sendFile(__dirname + '/room.html')
})

io.on('connection', socket => {
  console.log('user connected')

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id)
    Object.keys(rooms).forEach(roomName => {
      rooms[roomName] = rooms[roomName].filter(v => v.id !== socket.id)
    })
  })

  socket.on('enter', roomName => {

    if (rooms[roomName] && rooms[roomName].length > 1) {
      socket.emit('room is full')
    } else {
      socket.join(roomName, () => {
        let [ID, roomName] = Object.keys(socket.rooms)
        rooms[roomName] = rooms.hasOwnProperty(roomName) ? [...rooms[roomName], {id: ID, ready: false}] : [{ id: ID, ready: false}]

        const message = {
          message: 'welcome to room [' + roomName + ']',
          yourID: ID
        }

        io.to(ID).emit('MFS', message)
      })
    }
  })

  socket.on('ready', msg => {
    const roomName = msg.roomName
    rooms[roomName].forEach(u => {
      if (u.id === socket.id) u.ready = true
    })

    socket.to(roomName).emit('opponentIsReady')

    if (rooms[roomName].every(u => u.ready)) {
      io.in(roomName).emit('gameStart')
    }
  })

  socket.on('madeBaits', msg => {
    const roomName = msg.roomName
    const baits = msg.message

    socket.to(roomName).emit('opponentMadeBaits', baits)
  })

  socket.on('move', msg => {
    const roomName = msg.roomName
    const vector = msg.message

    socket.to(roomName).emit('opponentMoved', vector)
  })
})

server.listen(PORT, () => console.log('running on: ', PORT))