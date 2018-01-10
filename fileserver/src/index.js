var app = require('express')()
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
var cors = require('cors')
var fs = require('fs')

// default options
app.use(fileUpload())

// cross-origin-header.. enable all cors requests
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))

// route to the specific version of api routes
app.get('/', (req, res) => {
    res.json('hello')
})

app.post('/upload', function (req, res) {
    if (!req.files)
        return res.status(400).send('No files were uploaded.')

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.sampleFile

    // Use the mv() method to place the file somewhere on your server
    sampleFile.mv('/home/node/app/static/' + sampleFile.name, function (err) {
        if (err)
            return res.status(500).send(err)

        res.send('File uploaded!')
    });
})

app.get('/infos', (req, res)=>{

    let path = '/home/node/app/static'
    let returndata = []

    let items = fs.readdirSync(path)

    for (var i = 0; i < items.length; i++) {

        var file = path + '/' + items[i]
        let stats = fs.statSync(file)

        let size = stats["size"]
        var convertsize = Math.floor(Math.log(size) / Math.log(1024))
        let finalsize = (size / Math.pow(1024, convertsize)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][convertsize]

        returndata.push({ name: items[i], size: finalsize })

    }

    res.json(returndata)

})

app.delete('/remove', (req, res)=>{
    var filePath = '/home/node/app/static'
    fs.unlinkSync(filePath + '/' + req.query.filename)
    res.json('removed')

})

app.listen(process.env.PORT, () => {
    console.log('listening in port: ' + process.env.PORT)
})