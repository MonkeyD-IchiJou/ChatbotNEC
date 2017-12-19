var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
const path = require('path')
var cors = require('cors')

// temp only.. remove it in production
/*process.env.MASQL_HOST = 'localhost'
process.env.MYSQL_DATABASE = 'NECAIDB'
process.env.MYSQL_USER = 'necaidbuser'
process.env.MYSQL_PASSWORD = 'NECAIDBuser20171020'
process.env.jwtSecret = 'soseCREToMg8228'*/

var { Database } = require('./database')

// live chat io namespace
var lcIO = io.of('/lcIO')

// insert msg into my db server
var insertMessageToDB = (identifier, livechatId, chatbotid, message, from) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                "INSERT INTO total_messages (identifier, total_messages, livechat_id, chatbot_id) VALUES (?, 1, ?, ?) ON DUPLICATE KEY UPDATE total_messages = total_messages + 1",
                "SELECT total_messages FROM total_messages WHERE identifier=?",
                "INSERT INTO messages (identifier_message_number, message, sender) VALUES(?, ?, ?)"
            ]

            // all possible errors
            const db_errors = [
                'livechat id or chatbot id must exist'
            ]

            // livechat id or chatbot id must exist
            if (livechatId === null && chatbotid === null) {
                throw db_errors[0]
            }

            // first, insert or update the total_messages table
            let row_insertorupdate = await database.query(sql_queries[0], [identifier, livechatId, chatbotid])

            // secondly get the total_messages
            let row_totalmessages = await database.query(sql_queries[1], [identifier])

            // insert into my messages table
            let identifier_message_number = identifier + ':' + row_totalmessages[0].total_messages
            let row_insertmessage = await database.query(sql_queries[2], [identifier_message_number, message, from])

            resolve()

        }
        catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close the db
        let dbclose = await database.close()

    })

}

// cross-origin-header.. enable all cors requests
app.use(cors())
// Load View Engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// serve the client files
app.get('/', function (req, res) {

    // need to see whether the tokens are valid or not
    // check validation in client side?
    let livechatToken = req.query.livechatToken
    let chatbotToken = req.query.botToken

    res.render('index', {
        chatbotId: chatbotToken,
        livechatId: livechatToken
    })

})

// temp.. serve the admin frontend files
app.get('/admintemp', function (req, res) {
    res.render('admin')
})

// server listening on port 80
server.listen(process.env.PORT, () => {
    console.log('livechat socket server listening on port ' + process.env.PORT)
})

// emit clientlist to all the sockets in the room (whoever is listening)
var emitMsgToRoom = (whichio, roomname, channelname, msg) => {
    whichio.to(roomname).emit(channelname, msg)
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
var socketClientListUpdate = (whichio, roomname, socket) => {

    try{

        // get all the sockets in the room
        let allsocketsinfo = whichio.adapter.rooms[roomname]

        if(allsocketsinfo) {

            // get all the sockets in the room first
            let allsockets_id = Object.keys(allsocketsinfo.sockets)

            let clientsInfo = []
            for (let i = 0; i < allsockets_id.length; ++i) {

                let clientSocket = whichio.connected[allsockets_id[i]]
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
                emitMsgToRoom(whichio, roomname, 'clientlist_update', { clientsInfo: clientsInfo })
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

lcIO.on('connection', (socket) => {

    // listening on whether got any new clients request to join any room or not
    socket.on('client_join_room', (clientData) => {

        socket.join(clientData.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)

            socket.sessionData = {
                room: rooms[1], // store the room name in the socket session for this client
                isClientMah: true, // this socket is a client
                username: clientData.username,
                message: clientData.message,
                attentionLevel: clientData.attentionLevel
            }

            // informed that new user has joined the room
            socketClientListUpdate(lcIO, socket.sessionData.room)

            // confirmation about joining this room
            emitMsg(socket, 'client_joined', { socketId: rooms[0] })

        })

    })

    socket.on('client_update_info', (clientData) => {
        socket.sessionData.username = clientData.username
        socket.sessionData.message = clientData.message

        console.log(socket.sessionData)

        // informed that new user has joined the room
        socketClientListUpdate(lcIO, socket.sessionData.room)
    })

    // listening on whether got any admin request to join any room or not
    socket.on('admin_join_room', (admindata) => {

        socket.join(admindata.roomId, () => {

            // get the rooms info in this socket
            let rooms = Object.keys(socket.rooms)

            socket.sessionData = {
                room: rooms[1], // store the room name in the socket session for this admin
                isClientMah: false, // this socket is a client
                username: admindata.username,
                userid: admindata.userid
            }

            // confirmation about joining this room
            emitMsg(socket, 'admin_joined', { socketId: rooms[0] })

            // let the admin know about current list of client online
            socketClientListUpdate(lcIO, socket.sessionData.room, socket)

        })

    })

    // listening on whether admin want to send msg to client or not
    socket.on('admin_send_client_msg', (adminData) => {

        // admin is the sender
        let sender = adminData.userid

        // constructing the identifier
        let identifier = sender + ':' + adminData.clientUsername + ',' + adminData.clientSocketId

        // insert this msg to my db first
        insertMessageToDB(identifier, socket.sessionData.room, null, adminData.msg, sender).then(() => {

            // emit the msg back to client.. avoid pulling from the db server
            emitMsgPrivately(
                socket,
                adminData.clientSocketId,
                'client_receiving_msg',
                {
                    msg: adminData.msg,
                    adminUsername: adminData.username
                }
            )

        }).catch((error) => {
            console.log(error)
        })

    })

    // listening on whether client want to send msg to admin or not
    socket.on('client_send_admin_msg', (data) => {

        // get all the sockets in the room
        let allsocketsinfo = lcIO.adapter.rooms[socket.sessionData.room]

        // need to store the client msg into my db??

        if (allsocketsinfo) {

            let allsockets_id = Object.keys(allsocketsinfo.sockets)

            // first need to find out the admin socket id
            let adminInfos = []
            for (let i = 0; i < allsockets_id.length; ++i) {

                let adminSocket = lcIO.connected[allsockets_id[i]]
                let sessionData = adminSocket.sessionData

                // I only want to emit msg to my admin
                if (sessionData.isClientMah) {
                    continue
                }

                // emit to certain admin by matching the admin username
                if (sessionData.username === data.adminUsername) {

                    let sender = data.clientUsername + ',' + data.clientSocketId
                    let identifier = sessionData.userid + ':' + sender

                    insertMessageToDB(identifier, sessionData.room, null, data.msg, sender).then(() => {

                        // simply send it back to admin after storing it into my db.. avoid requesting my db server
                        emitMsgPrivately(
                            socket,
                            allsockets_id[i],
                            'admin_receiving_msg',
                            {
                                msg: data.msg,
                                clientSocketId: data.clientSocketId
                            }
                        )

                    }).catch((error) => {
                        console.log(error)
                    })

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
            socketClientListUpdate(lcIO, roomname)

            // client officially leave this room
            socket.leave(roomname)

        }
        else {
            // admin officially leave this room
            socket.leave(roomname)
        }

    })

})
