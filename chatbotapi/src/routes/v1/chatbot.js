const router = require('express').Router()
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
const uuidv4 = require('uuid/v4')
const bs58 = require('bs58')
const MongoClient = require('mongodb').MongoClient
const json2md = require("json2md")

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

json2md.converters.storyname = function (input, json2md) {
    return "## " + input
}

json2md.converters.intentname = function (input, json2md) {
    let output = ''
    for (let i = 0; i < input.length; ++i) {
        if (typeof input[i] == 'string') {
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
        intentname: [
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
        intentname: [
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
    },
    {
        storyname: "sad path 2"
    },
    {
        intentname: [
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
            "_mood_deny",
            {
                actions: [
                    "utter_goodbye"
                ]
            }
        ]
    },
    {
        storyname: "say goodbye"
    },
    {
        intentname: [
            "_goodbye",
            {
                actions: [
                    "utter_goodbye"
                ]
            }
        ]
    }

])



// generate a uuid for chatbot
var getUUID = () => {
    return bs58.encode(Buffer.from(uuidv4()))
}

// create new live chat for this user
var createNewChatbot = (user_submit) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT plan_id FROM users_plans WHERE user_id=?',
                'SELECT * FROM plans WHERE id=?',
                'SELECT * FROM chatbot WHERE createdby=?',
                'INSERT INTO chatbot (uuid, createdby, name, description) VALUES (?, ?, ?, ?)'
            ]

            // all possible errors
            const db_errors = [
                'cannot find user plan id',
                'cannot find the plan detail',
                'livechat chatbot exceed limit'
            ]

            // do things in parallel
            let all_results = await Promise.all([
                new Promise(async (resolve, reject) => {
                    // find out the user current plans

                    let user_planid = ''

                    {
                        // find the plan id
                        let row_plan_id = await database.query(sql_queries[0], [user_submit.user_id])
                        user_planid = row_plan_id[0]
                    }

                    if (!user_planid) {
                        reject(db_errors[0])
                    }

                    let plan_info = ''

                    {
                        let row_plan_info = await database.query(sql_queries[1], [user_planid.plan_id])
                        plan_info = row_plan_info[0]
                    }

                    if (!plan_info) {
                        reject(db_errors[1])
                    }

                    // return the user signed up plan info
                    resolve(plan_info)
                }),
                new Promise(async (resolve, reject) => {
                    // find all projects created by this user
                    let row_livechats = await database.query(sql_queries[2], [user_submit.user_id])
                    resolve(row_livechats)
                })
            ])

            let plan_info = all_results[0]
            let all_livechats = all_results[1]

            if (all_livechats.length >= plan_info.livechat_limit) {
                throw db_errors[2]
            }

            // create the new live chat
            let row_insert_chatbot = await database.query(sql_queries[3], [user_submit.uuid, user_submit.user_id, user_submit.name, user_submit.description])
            resolve(row_insert_chatbot.insertId)

        }
        catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close the db
        let dbclose = await database.close()

    })

}

// delete a live chat for this user
var deleteChatbotProject = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'DELETE FROM chatbot WHERE uuid=?'
            ]

            // all possible errors
            const db_errors = [
                'no such chatbot project'
            ]

            // delete this intent
            let row_deletelivechat = await database.query(sql_queries[0], [chatbot_uuid])

            if (!row_deletelivechat.affectedRows) {
                throw db_errors[0]
            }

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

// refresh live chat project uuid
var refreshChatbotUUID = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'UPDATE chatbot SET uuid=? WHERE uuid=?'
            ]

            // all possible errors
            const db_errors = [
                'no such chatbot project'
            ]

            // delete this intent
            let row_updateuuid = await database.query(sql_queries[0], [getUUID(), chatbot_uuid])

            if (!row_updateuuid.affectedRows) {
                throw db_errors[0]
            }

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

// get the chatbot info based on this uuid
var getChatbotInfo = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT * FROM chatbot WHERE uuid=?'
            ]

            // all possible errors
            const db_errors = [
                'no such chatbot project'
            ]

            // get this chatbot
            let row_chatbot = await database.query(sql_queries[0], [chatbot_uuid])

            if (row_chatbot.length <= 0) {
                throw db_errors[0]
            }

            resolve(row_chatbot)

        }
        catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close the db
        let dbclose = await database.close()

    })

}

// get the live chat info based on this uuid
var getChatbotsInfo = (user_id) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT * FROM chatbot WHERE createdby=?'
            ]

            // all possible errors
            const db_errors = [
                'no such chatbot project'
            ]

            // get the chatbots
            let row_chatbots = await database.query(sql_queries[0], [user_id])

            if (row_chatbots.length <= 0) {
                throw db_errors[0]
            }

            resolve(row_chatbots)

        }
        catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close the db
        let dbclose = await database.close()

    })

}

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

// create a new live chat
router.post(
    '/',
    [
        check('name', 'must have a name for this chatbot project').exists().isLength({ min: 1 }),
        check('description', 'must have a description for this chatbot').exists().isLength({ min: 1 })
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            // base 58 encode it
            let public_uuid = getUUID()

            createNewChatbot({ 
                user_id: req.decoded.data.i, 
                name: matchedData(req).name, 
                description: matchedData(req).description, 
                uuid: public_uuid 
            }).then((result) => {

                // send the result back to client
                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ success: true }))

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }

    }
)

// delete this a chabot project
router.delete(
    '/',
    [
        check('uuid', 'uuid for the chatbot project is missing').exists().isLength({ min: 1 }),
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {

            deleteChatbotProject(matchedData(req).uuid).then(() => {

                // send the result back to client
                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ success: true }))

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })

        }

    }
)

// refresh chatbot uuid
router.post(
    '/refreshUUID',
    [
        check('uuid', 'uuid for the chatbot project is missing').exists().isLength({ min: 1 }),
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            refreshChatbotUUID(matchedData(req).uuid).then(() => {

                // send the result back to client
                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ success: true }))

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }

    }
)

// get a specific chatbot project info for this user
router.get(
    '/info',
    [
        check('uuid', 'uuid for the chatbot project is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {
        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            getChatbotInfo(matchedData(req).uuid).then((result) => {

                // send the result back to client
                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ success: true, result: result }))

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }
    }
)

var getDomainFromChatbot = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('domain')

            // find all documents
            let findall = await collection.find({ uuid: chatbot_uuid }).toArray()

            if (findall.length > 0) {
                resolve(findall[0])
            }

            throw 'no such domain, are u sure this is the right chatbot uuid?'

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

var getNLUdataFromChatbot = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('nlu_data')

            // find all documents
            let findall = await collection.find({ uuid: chatbot_uuid }).toArray()

            if (findall.length > 0) {
                resolve(findall[0])
            }

            throw 'no such nlu_data, are u sure this is the right chatbot uuid?'

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

var getStoriesFromChatbot = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('stories')

            // find all documents
            let findall = await collection.find({ uuid: chatbot_uuid }).toArray()

            if (findall.length > 0) {
                resolve(findall[0])
            }

            throw 'no such stories, are u sure this is the right chatbot uuid?'

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

// get all the chatbot projects infos for this user
router.get(
    '/infos',
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            getChatbotsInfo(req.decoded.data.i).then((results) => {

                // send the result back to client
                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ success: true, result: results }))

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }

    }
)

// the rest of the api need chatbot uuid in order to do things
router.use(
    [
        check('uuid', 'must have a chatbot uuid').exists()
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
            // get the uuid from body
            let uuid = matchedData(req).uuid

            getChatbotInfo(uuid).then((result) => {

                // Officially got the uuid
                req.chatbot_info = result[0]
                next()

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })

        }

    }
)

// get the domain from this chatbot
router.get('/domain', (req, res)=>{

    getDomainFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

// get the nlu_data from this chatbot
router.get('/NLUData', (req, res) => {

    getNLUdataFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

// get the stories from this chatbot
router.get('/stories', (req, res) => {

    getStoriesFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

module.exports = router
