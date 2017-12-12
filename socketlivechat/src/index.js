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

// temp.. serve the admin frontend files
app.get('/admintemp/:livechatId', function (req, res) {

    res.render('admin', {
        livechatId: req.params.livechatId
    })

})

// server listening on port 80
server.listen(process.env.PORT, () => {
    console.log('livechat socket server listening on port ' + process.env.PORT)
})

// update and emit the list of clients' socket id
var socketClientListUpdate = (roomname) => {

    try{
        let allsocketsinfo = io.nsps['/'].adapter.rooms[roomname]

        if(allsocketsinfo) {
            // get all the sockets in the room first
            let allsockets_id = Object.keys(allsocketsinfo.sockets)

            let clientsInfo = []
            for (let i = 0; i < allsockets_id.length; ++i) {

                let clientSocket = io.sockets.connected[allsockets_id[i]]

                // I only need clients socket
                if (clientSocket.isClientMah) {
                    clientsInfo.push({ clientSocketId: allsockets_id[i], clientName: clientSocket.username})
                }

            }

            // send the online clients list
            io.to(roomname).emit('clientlist_update', { clientsInfo: clientsInfo })
        }
    }
    catch(e) {
        console.log(e)
    }

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

            // this socket is a client
            socket.isClientMah = true

            // store the client username
            socket.username = data.username

            // informed that new user has joined the room
            socketClientListUpdate(socket.room)

            // confirmation about joining this room
            socket.emit('client_joined', {socketId: rooms[0]})
        })

    })

    // listening on whether got any admin request to join any room or not
    socket.on('admin_join_room', (data)=>{

        socket.join(data.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)

            // store the room name in the socket session for this admin
            socket.room = rooms[1]

            // this socket is an admin
            socket.isClientMah = false

            // store the admin username
            socket.username = data.username

            // confirmation about joining this room
            socket.emit('admin_joined', { socketId: rooms[0] })

            // let the admin know about current list of client online
            socketClientListUpdate(socket.room)

        })

    })

    // listening on whether admin want to send msg to client or not
    socket.on('admin_send_client_msg', (data) => {
        console.log(data)
        socket.to(data.clientSocketId).emit('client_receiving_msg', { msg: data.msg, adminUsername: data.adminUsername} );
    })

    // when the user disconnects
    socket.on('disconnect', () => {

        if (socket.isClientMah) {
            // update the list of client socket id again
            socketClientListUpdate(socket.room)

            // client officially leave this room
            socket.leave(socket.room)
        }
        else {
            // admin officially leave this room
            socket.leave(socket.room)
        }

    })

})