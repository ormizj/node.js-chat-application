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
    socket.on('join', ({ username, room }, callback) => {
        if (room === '') room = 'general'
        const { error } = addUser({ id: socket.id, username, room })
        if (error) return callback(error)
        socket.join(room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(room).emit('message', generateMessage('Admin', `${username} has joined the room!`))

        io.to(room).emit('roomData', {
            users: getUsersInRoom(room),
            room
        })

        socket.on('sendMessage', (message, callback) => {
            const filter = new Filter()
            if (filter.isProfane(message)) {
                socket.emit('message', generateMessage('Admin', 'Profanity is not allowed!'))
                return callback()
            }
            io.to(room).emit('message', generateMessage(username, message))
            callback()
        })

        socket.on('sendLocation', (coords, callback) => {
            io.to(room).emit('locationMessage', generateLocation(username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
            callback()
        })

        socket.on('disconnect', () => {
            removeUser(socket.id)
            io.to(room).emit('message', generateMessage('Admin', `${username} has left!`))
            io.to(room).emit('roomData', {
                users: getUsersInRoom(room),
                room
            })
        })

        callback()
    })
})

export default app
export { server }