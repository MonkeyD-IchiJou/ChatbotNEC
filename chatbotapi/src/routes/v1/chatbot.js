const router = require('express').Router()
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
const uuidv4 = require('uuid/v4')
const bs58 = require('bs58')
const MongoClient = require('mongodb').MongoClient
const json2md = require("json2md")

json2md.converters.storyname = function (input, json2md) {
    return "## " + input
}

json2md.converters.asterisks = function (input, json2md) {
    let output = ''
    for(let i = 0; i < input.length; ++i) {
        if(typeof input[i] == 'string') {
            output += "* " + input[i] + "\n"
        }
        else {
            let j2md = json2md([
                input[i]
            ])
            output += j2md
        }
    }
    return output
}

json2md.converters.actions = function (input, json2md) {
    let output = ''
    for (let i = 0; i < input.length; ++i) {
        if (typeof input[i] == 'string') {
            output += "  - " + input[i] + "\n"
        }
    }
    return output
}


let j2md = json2md([
    {
        storyname: "happy path"
    },
    {
        asterisks: [
            '_greet',
            {
                actions: [
                    "utter_greet"
                ]
            },
            '_mood_great',
            {
                actions: [
                    "utter_happy"
                ]
            }
        ]
    },
    {
        storyname: "sad path 1"
    },
    {
        asterisks: [
            "_greet",
            {
                actions: [
                    "utter_greet"
                ]
            },
            "_mood_unhappy",
            {
                actions: [
                    "utter_cheer_up",
                    "utter_did_that_help"
                ]
            },
            "_mood_affirm",
            {
                actions: [
                    "utter_happy"
                ]
            }
        ]
    }
    
])

j2md

// temp only.. remove it in production
/*process.env.MASQL_HOST = 'localhost'
process.env.MAMONGO_HOST = 'localhost'
process.env.MYSQL_DATABASE = 'NECAIDB'
process.env.MYSQL_USER = 'necaidbuser'
process.env.MYSQL_PASSWORD = 'NECAIDBuser20171020'
process.env.jwtSecret = 'soseCREToMg8228'*/

var { Database } = require('../../database')

// MongoDB Connection URL
const url = 'mongodb://' + process.env.MAMONGO_HOST

var mongodb_example = () => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('domain')

            // Insert some documents
            //let ins = await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }])
            //ins

            // find all documents
            let findall = await collection.find({}).toArray()
            findall

            resolve(findall)

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

/*mongodb_example().then((r)=>{
    console.log(r)
}).catch((e)=>{
    console.log(e)
})*/

// every api router will go through JWT verification first
router.use(
    [
        check('token', 'must have a token').exists()
    ],
    (req, res, next) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {

            // get the matched data
            // get the jwt token from body
            let token = matchedData(req).token

            jwt.verify(token, process.env.jwtSecret, (err, decoded) => {
                if (err) {
                    return res.json({ success: false, errors: { jwt: 'json web token validate error' } })
                }
                else {

                    // Officially trusted this client!
                    req.decoded = decoded
                    next()
                }
            })
        }

    }
)

router.get('/', (req, res) => {
    res.json({success: true})
})

module.exports = router