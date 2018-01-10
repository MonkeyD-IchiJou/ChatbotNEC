var app = require('express')()
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
var cors = require('cors')

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
        return res.status(400).send('No files were uploaded.');

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.sampleFile;

    // Use the mv() method to place the file somewhere on your server
    sampleFile.mv('/home/node/app/src/static/' + sampleFile.name, function (err) {
        if (err)
            return res.status(500).send(err);

        res.send('File uploaded!');
    });
})

app.listen(process.env.PORT, () => {
    console.log('listening in port: ' + process.env.PORT)
})