var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
const path = require('path')

// Load View Engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// serve the client files
app.get('/:livechatId', function (req, res) {

    res.render('index', {
        livechatId: req.params.livechatId
    })

})

// server listening on port 80
server.listen(process.env.PORT, () => {
    console.log('livechat server listening on port ' + process.env.PORT)
})

// update and emit the list of clients' socket id
var socketClientListUpdate = (socket) => {
    let allsockets_inroom = io.nsps['/'].adapter.rooms[socket.room]
    socket.to(socket.room).emit('clientlist_update', { clientSocketsId: allsockets_inroom })
}

io.on('connection', (socket) => {

    // listening on whether got any new clients request to join any room or not
    // each live chat projects is one room
    // room name will be the UUID of the livechat project
    socket.on('client_join_room', (data) => {

        socket.join(data.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)
            
            // store the room name in the socket session for this client
            socket.room = rooms[1]

            // informed that new user has joined the room
            socketClientListUpdate(socket)
        })

    })

    // when the user disconnects
    socket.on('disconnect', () => {

        // update the list of client socket id again
        socketClientListUpdate(socket)

        // client officially leave this room
        socket.leave(socket.room)

    })

})