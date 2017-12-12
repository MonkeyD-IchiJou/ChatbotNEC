var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)

// serve the client files
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/build/index.html')
})

server.listen(process.env.PORT, () => {
    console.log('livechat server listening on port ' + process.env.PORT)
})

// each live chat projects is one room
// room name will be the UUID of the livechat project
var totalrooms = ['1', '2', '3']

io.on('connection', (socket) => {

    console.log('a user has connected, checked which room this user is supposed to be in?')

    let roomname = 'm8nySihGhfPK37Wj5dTNkUHSnkMdaVjVJjFGvZMp462pbqJAB'

    socket.join(roomname, () => {
        let rooms = Object.keys(socket.rooms)
        console.log(rooms) // [ 'room name', 'socket id' ]
    })

    io.emit('listenpls', 'hello ' + socket.id)

    socket.to(roomname).emit('an event', { some: 'data' })

})