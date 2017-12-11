var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)

// serve the client files
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/build/index.html')
})

server.listen(process.env.PORT)

// socket io connection
io.on('connection', function (socket) {
    console.log('a user has connected')
    socket.emit('news', { hello: 'world' })
    socket.on('my other event', function (data) {
        console.log(data)
    })
})
