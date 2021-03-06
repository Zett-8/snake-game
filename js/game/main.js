'use strict'

import Game from './game.js'
import {
  clear,
  renderMessage,
  imReady,
  opponentIsReady,
  waitingForOpponent,
  updateObjects,
  renderField,
  countDown
} from './renderer.js'

const canvas1 = document.getElementById('field1')
const canvas2 = document.getElementById('field2')
const ctx1 = canvas1.getContext('2d')
const ctx2 = canvas2.getContext('2d')

const game = new Game(canvas1, ctx1)
const game2 = new Game(canvas2, ctx2)

window.onload = function() {
  setKeyConfigs()
  renderField(game)
  renderField(game2)
}

const routine = () => {
  clear(game)
  clear(game2)
  const bitBait = game.moveSnake()
  game2.moveSnake()

  if (bitBait) {
    socket.emit('bitBait', makeMessage())
    game2.debt += 1

    if (game.score > 0 && game.score % 5 === 0) {
      game2.willShrink = true
      socket.emit('attack', makeMessage())
    }
  }
  updateObjects(game)
  updateObjects(game2)
  watch()
}

const startGame = () => {
  // == init game
  game.reset()
  game2.reset()
  const baits = game.makeBait()
  socket.emit('madeDiff', makeMessage({ baits, snake: game.snake.data }))
  renderField(game)
  renderField(game2)
  updateObjects(game)
  updateObjects(game2)
  // ==

  game.play = setInterval(() => {
    routine()
  }, game.speed)
}

const watch = () => {
  const head = game.snake.data[0]
  if (head.x < 0 || head.x >= game.fieldSize || head.y < 0 || head.y >= game.fieldSize) {
    gameOver('You lost...')
    socket.emit('gameOver', makeMessage())
  }

  if (game.snake.bitItself()) {
    gameOver('You lost')
    socket.emit('gameOver', makeMessage())
  }

  if (game.willShrink) {
    game.fieldSize -= game.SIZE * 2
    game.shrink(game.SIZE * 2)
    renderField(game)
    game.checkBaitsPosition()
    updateObjects(game)
    game.willShrink = false
  }

  if (game2.willShrink) {
    game2.fieldSize -= game2.SIZE * 2
    game2.shrink(game2.SIZE * 2)
    renderField(game2)
    game2.checkBaitsPosition()
    updateObjects(game2)
    game2.willShrink = false
  }

  const diff = game.makeBait()
  if (diff) {
    socket.emit('madeDiff', makeMessage({ baits: diff, snake: game.snake.data }))
  }
}

const gameOver = message => {
  clearInterval(game.play)
  clearInterval(game2.play)
  game.play = null
  game2.play = null

  ;(() => {
    return new Promise(resolve => setTimeout(resolve, 400))
  })().then(() => renderMessage(message))
}

// @ socket.io

socket.on('opponentIsReady', () => {
  opponentIsReady()
})

socket.on('gameStart', () => {
  countDown()
  ;(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 3000)
    })
  })().then(() => {
    startGame()
  })
})

socket.on('opponentMoved', velocity => {
  game2.velocity = velocity
})

socket.on('opponentBitBait', () => {
  game.debt += 1
})

socket.on('opponentMadeDiff', ({ baits, snake }) => {
  game2.baits.data = baits
  game2.snake.data = snake
})

socket.on('attacked', () => {
  game.willShrink = true
})

socket.on('opponent disconnected', () => {
  if (game.play) {
    gameOver('oops, the opponent left... \n or perhaps connection error')
  } else {
    // waitingForOpponent()
    window.location.reload()
  }
})

socket.on('youWon', () => {
  gameOver('You won!')
})

const setKeyConfigs = () => {
  document.onkeydown = e => handleKeyDown(e)
  document.body.ontouchend = () => handleTouched()

  // start button setting
  window.readyButton.onclick = () => {
    imReady()
    socket.emit('ready', makeMessage())
  }

  window.playAgainButton.onclick = () => {
    window.location.reload()
  }

  const handleKeyDown = e => {
    // snake cannot return
    if (
        (game.velocity.d === 'ArrowUp' && e.code === 'ArrowDown') ||
        (game.velocity.d === 'ArrowRight' && e.code === 'ArrowLeft') ||
        (game.velocity.d === 'ArrowDown' && e.code === 'ArrowUp') ||
        (game.velocity.d === 'ArrowLeft' && e.code === 'ArrowRight')
      ) return null

    // set velocity to input direction
    switch (e.code) {
      case 'ArrowUp':
        game.velocity = { d: e.code, x: 0, y: -game.SIZE }
        break

      case 'ArrowRight':
        game.velocity = { d: e.code, x: game.SIZE, y: 0 }
        break

      case 'ArrowDown':
        game.velocity = { d: e.code, x: 0, y: game.SIZE }
        break

      case 'ArrowLeft':
        game.velocity = { d: e.code, x: -game.SIZE, y: 0 }
        break

      case 'Period':
        game.velocity = { d: e.code, x: 0, y: 0 }
    }

    socket.emit('move', makeMessage(game.velocity))
  }

  // for smart phone
  const _handleTouched = () => {
    let n = 0

    return () => {
      if (!game.play) return null

      const order = ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight']
      handleKeyDown({ code: order[n] })
      n = n > 2 ? 0 : n + 1
    }
  }
  const handleTouched= _handleTouched()
}
