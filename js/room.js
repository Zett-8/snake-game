const socket = io({ transports: ['websocket'] })

const h1 = document.querySelector('h1')
const myStatus = document.querySelector('.myStatus')
const opponentStatus = document.querySelector('.opponentStatus')
const readyButton = document.querySelector('.readyButton')

let roomName = window.location.pathname.split('/')[2]

const makeMessage = (message='') => ({
  roomName,
  message
})

h1.innerText = roomName === 'random' ? 'Snake online' : 'room [' + roomName + ']'

socket.on('connected', id => {
  console.log('successfully connected, id[' + id + ']')
})

socket.emit('enter', roomName)

socket.on('room is full', () => {
  confirm('room is full')
  window.location.href = '/'
})

socket.on('welcome', msg => {
  console.log(msg)
  roomName = msg.roomName
  if (msg.bothAreHere) {
    myStatus.style.color = '#cc0000'
    myStatus.innerText = 'not ready yet'
    opponentStatus.style.color = '#cc0000'
    opponentStatus.innerText = 'not ready yet'
    readyButton.style.visibility = 'visible'
  }
})

