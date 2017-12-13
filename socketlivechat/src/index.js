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

// emit clientlist to all the sockets in the room (whoever is listening)
var emitMsgToRoom = (roomname, channelname, msg) => {
    io.to(roomname).emit(channelname, msg)
}

// emit msg to self (if i am listening)
var emitMsg = (socket, channelname, msg) => {
    socket.emit(channelname, msg)
}

// emit msg privately
var emitMsgPrivately = (from, sendto, channelname, msg) => {
    from.to(sendto).emit(channelname, msg)
}

// update and emit the list of clients' socket id
var socketClientListUpdate = (roomname, socket) => {

    try{

        // get all the sockets in the room
        let allsocketsinfo = io.nsps['/'].adapter.rooms[roomname]

        if(allsocketsinfo) {

            // get all the sockets in the room first
            let allsockets_id = Object.keys(allsocketsinfo.sockets)

            let clientsInfo = []
            for (let i = 0; i < allsockets_id.length; ++i) {

                let clientSocket = io.sockets.connected[allsockets_id[i]]
                let sessionData = clientSocket.sessionData

                // I only need clients socket
                if (sessionData.isClientMah) {
                    clientsInfo.push({ 
                        clientSocketId: allsockets_id[i], 
                        clientName: sessionData.username, 
                        clientMsg: sessionData.message,
                        clientAttentionLevel: sessionData.attentionLevel
                    })
                }

            }

            if(socket) {
                emitMsg(socket, 'clientlist_update', { clientsInfo: clientsInfo })
            }
            else {
                // emit the online clients list
                emitMsgToRoom(roomname, 'clientlist_update', { clientsInfo: clientsInfo })
            }

        }

    }
    catch(e) {
        // print out the error and carry on
        console.log(e)
    }

}

// NOTE:
// each live chat projects is one room
// room name will be the UUID of the livechat project

io.on('connection', (socket) => {

    // listening on whether got any new clients request to join any room or not
    socket.on('client_join_room', (data) => {

        socket.join(data.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)

            socket.sessionData = {
                room: rooms[1], // store the room name in the socket session for this client
                isClientMah: true, // this socket is a client
                username: data.username,
                message: data.message,
                attentionLevel: data.attentionLevel
            }

            // informed that new user has joined the room
            socketClientListUpdate(socket.sessionData.room)

            // confirmation about joining this room
            emitMsg(socket, 'client_joined', { socketId: rooms[0] })

        })

    })

    // listening on whether got any admin request to join any room or not
    socket.on('admin_join_room', (data)=>{

        socket.join(data.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)

            socket.sessionData = {
                room: rooms[1], // store the room name in the socket session for this admin
                isClientMah: false, // this socket is a client
                username: data.username
            }

            // confirmation about joining this room
            emitMsg(socket, 'admin_joined', { socketId: rooms[0] })

            // let the admin know about current list of client online
            socketClientListUpdate(socket.sessionData.room, socket)

        })

    })

    // listening on whether admin want to send msg to client or not
    socket.on('admin_send_client_msg', (data) => {
        emitMsgPrivately(
            socket, 
            data.clientSocketId, 
            'client_receiving_msg', 
            { 
                msg: data.msg, 
                adminUsername: data.adminUsername 
            }
        )
    })

    // listening on whether client want to send msg to admin or not
    socket.on('client_send_admin_msg', (data) => {

        // get all the sockets in the room
        let allsocketsinfo = io.nsps['/'].adapter.rooms[socket.sessionData.room]

        // need to store the client msg into my db??

        if (allsocketsinfo) {

            let allsockets_id = Object.keys(allsocketsinfo.sockets)

             // first need to find out the admin socket id
            let adminInfos = []
            for (let i = 0; i < allsockets_id.length; ++i) {

                let adminSocket = io.sockets.connected[allsockets_id[i]]
                let sessionData = adminSocket.sessionData

                // I only want to emit msg to my admin
                if (sessionData.isClientMah) {
                    continue
                }

                // emit to certain admin by matching the admin username
                if (sessionData.username === data.adminUsername) {
                    emitMsgPrivately(
                        socket,
                        allsockets_id[i],
                        'admin_receiving_msg',
                        {
                            msg: data.msg,
                            clientSocketId: data.clientSocketId
                        }
                    )
                }

            }

        }

    })

    // when the user disconnects
    socket.on('disconnect', () => {

        let roomname = socket.sessionData.room

        if (socket.sessionData.isClientMah) {
            // if the socket is client

            // update the list of client socket id again to the room
            socketClientListUpdate(roomname)

            // client officially leave this room
            socket.leave(roomname)

        }
        else {
            // admin officially leave this room
            socket.leave(roomname)
        }

    })

})