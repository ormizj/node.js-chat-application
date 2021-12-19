import path, { dirname } from 'path'
import http from 'http'
import { fileURLToPath } from 'url'
import express from 'express'
import socketio from 'socket.io'
import Filter from 'bad-words'
import { generateLocation, generateMessage } from './utils/messages.mjs'
import { getUser, getUsersInRoom, addUser, removeUser } from './utils/users.mjs'

//configuration
const app = express()
const __dirname = dirname(fileURLToPath(import.meta.url))
const publicPath = path.join(__dirname, '../public')
app.use(express.static(publicPath))
const server = http.createServer(app)
const io = socketio(server)
//configuration

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', ({ username, room }, callback) => {
        if (room === '') room = 'general'
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error) return callback(error)
        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(room).emit('message', generateMessage('Admin', `${user.username} has joined the room!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if (filter.isProfane(message)) return callback('Profanity is not allowed!')
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

export default app
export { server }