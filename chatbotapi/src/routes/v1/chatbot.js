const router = require('express').Router()
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
const uuidv4 = require('uuid/v4')
const bs58 = require('bs58')
const MongoClient = require('mongodb').MongoClient
const json2md = require("json2md")
const request = require('superagent')
var fs = require('fs')

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

// chatbot query message 
router.post(
    '/query',
    [
        check('text_message', 'text_message for the chatbot query is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            request
                .get('nluengine:5000/parse')
                .query({ q: matchedData(req).text_message })
                .end((err, res2) => {
                    if (err) {
                        res.json({ err: err.toString() })
                    }
                    let allcbres = res2.body
                    let chosenintent = allcbres.intent_ranking[0]
                    chosenintent.name
                    var obj = JSON.parse(fs.readFileSync('/cb_datas/TESTINGONLY/intents/' + chosenintent.name + '.json', 'utf8'))
                    res.json({ allres: allcbres, cbres: obj })
                })
        }

    }
)

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
            let findall = await collection.find({ 'uuid': chatbot_uuid }).toArray()

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
            let findall = await collection.find({ 'uuid': chatbot_uuid }).toArray()

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
            let findall = await collection.find({ 'uuid': chatbot_uuid }).toArray()

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

var updateDomainForChatbot = (chatbot_uuid, domain) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('domain')

            // Update the document with an atomic operator
            let update_chatbot = await collection.updateOne({ uuid: chatbot_uuid }, { $set: {domain: domain} }, { upsert: true, w: 1 })

            if (!update_chatbot.result.n) {
                throw 'no such domain for this chatbot'
            }
            resolve(update_chatbot.result)

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

var updateNLUDataForChatbot = (chatbot_uuid, rasa_nlu_data) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('nlu_data')

            // Update the document with an atomic operator
            let update_chatbot = await collection.updateOne({ uuid: chatbot_uuid }, { $set: {rasa_nlu_data: rasa_nlu_data} }, { upsert: true, w: 1 })

            if (!update_chatbot.result.n) {
                throw 'no such nlu data for this chatbot'
            }
            resolve(update_chatbot.result)

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

var updateStoriesForChatbot = (chatbot_uuid, stories) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('stories')

            // Update the document with an atomic operator
            let update_chatbot = await collection.updateOne({ uuid: chatbot_uuid }, { $set: { stories: stories } }, { upsert: true, w: 1 })

            if (!update_chatbot.result.n) {
                throw 'no such stories for this chatbot'
            }
            resolve(update_chatbot.result)

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })

}

var chatbotTraining = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        try {

            // do things in parallel
            let all_results = await Promise.all([
                new Promise(async (resolve, reject) => {
                    try {
                        let cbdomain = await getDomainFromChatbot(chatbot_uuid)
                        resolve(cbdomain.domain)
                    } catch (e) {
                        // reject the error
                        reject(e.toString())
                    }
                }),
                new Promise(async (resolve, reject) => {
                    try {
                        let cbstories = await getStoriesFromChatbot(chatbot_uuid)
                        resolve(cbstories.stories)
                    } catch (e) {
                        // reject the error
                        reject(e.toString())
                    }
                })
            ])

            // convert stories to md string
            let stories_md = json2md(all_results[1])

            resolve({ domain: all_results[0], stories: stories_md })

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

    })

}

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

// post the domain
router.post(
    '/domain',
    [
        check('domain', 'domain for the chatbot project is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {
        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            let domain = matchedData(req).domain
            updateDomainForChatbot(
                req.chatbot_info.uuid,
                domain
            ).then((result) => {
                res.json({ success: true })
            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }
    }
)

var updateCBDatasForChatbot = (chatbot_uuid, cbdatas) => {
    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('chatbot_ml_datas')

            // Update the document with an atomic operator
            let update_chatbot = await collection.updateOne({ uuid: chatbot_uuid }, { $set: { entities: cbdatas.entities, intents: cbdatas.intents, actions: cbdatas.actions, stories: cbdatas.stories } }, { upsert: true, w: 1 })

            if (!update_chatbot.result.n) {
                throw 'no such cb datas for this cb'
            }
            resolve(update_chatbot.result)

        } catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close my mongodb collection
        client.close()
    })
}

var getCBDatasFromChatbot = (chatbot_uuid) => {

    return new Promise(async (resolve, reject) => {

        let client = ''

        try {
            // connect to my mongodb
            client = await MongoClient.connect(url)

            // connect to my db
            const db = client.db(process.env.MYSQL_DATABASE)

            // Get the collection from my db
            const collection = db.collection('chatbot_ml_datas')

            // find all documents
            let findall = await collection.find({ 'uuid': chatbot_uuid }).toArray()

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

var convertToNluDataFormat = (intents, entities) => {

    let rasa_nlu_data = {
        common_examples: [],
        entity_synonyms: [],
        regex_features: []
    }

    // preparing entity_synonyms
    rasa_nlu_data.entity_synonyms = entities.map((entity, index) => {
        return {
            value: entity.value,
            synonyms: [...entity.synonyms]
        }
    })

    // preparing common_examples
    intents.forEach((intent) => {
        let intentName = intent.intent
        let entitiesToSearch = [...intent.entities]

        rasa_nlu_data.common_examples.push(...intent.texts.map((text) => {

            let entitiesIn = []

            // find out all the synonyms first
            entitiesToSearch.forEach((entityToSearch, eindex) => {
                for (let i = 0; i < entities.length; ++i) {
                    if (entityToSearch === entities[i].value) {
                        const sns = entities[i].synonyms
                        sns.forEach((sn) => {
                            let start = text.indexOf(sn)
                            if (start >= 0) {
                                let end = start + sn.length
                                entitiesIn.push({ start: start, end: end, value: sn, entity: entityToSearch })
                            }
                        })
                    }
                }
            })

            return {
                text: text,
                intent: intentName,
                entities: entitiesIn
            }
        }))

    })

    return rasa_nlu_data
}
















// get the chatbot datas from this chatbot
router.get('/CBDatas', (req, res) => {

    getCBDatasFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

// post entities, intents, actions and stories cb datas and store it in my mariadb
router.post(
    '/CBDatas',
    [
        check('cbdatas', 'cbdatas for the chatbot project is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {
        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            updateCBDatasForChatbot(
                req.chatbot_info.uuid,
                matchedData(req).cbdatas
            ).then((result) => {

                // when posted new data, train it straight away
                // get the nlu data first
                getCBDatasFromChatbot(req.chatbot_info.uuid).then((result) => {
                    // ask for training
                    request
                        .post('nluengine:5000/train?project=' + req.chatbot_info.uuid + '&fixed_model_name=model&pipeline=spacy_sklearn')
                        .set('contentType', 'application/json; charset=utf-8')
                        .set('dataType', 'json')
                        .send({
                            rasa_nlu_data: convertToNluDataFormat(result.intents, result.entities)
                        })
                        .end((err, res2) => {
                            if (err) {
                                return res.status(422).json({ success: false, errors: err })
                            }
                            res.json({ success: true })
                        })
                }).catch((error) => {
                    return res.status(422).json({ success: false, errors: error.toString() })
                })

            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }
    }
)

// train my dialogue using nlu_data
router.post('/cbtraining', (req, res) => {

    // get the nlu data first
    getCBDatasFromChatbot(req.chatbot_info.uuid).then((result) => {

        // ask for training
        request
            .post('nluengine:5000/train?project=' + req.chatbot_info.uuid + '&fixed_model_name=model&pipeline=spacy_sklearn')
            .set('contentType', 'application/json; charset=utf-8')
            .set('dataType', 'json')
            .send({
                rasa_nlu_data: convertToNluDataFormat(result.intents, result.entities)
            })
            .end((err, res2) => {
                if (err) {
                    return res.status(422).json({ success: false, errors: err })
                }
                res.json({ success: true })
            })

    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error.toString() })
    })

})

// chatbot query message 
router.post(
    '/nlucheck',
    [
        check('text_message', 'text_message for the chatbot query is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            request
                .get('nluengine:5000/parse')
                .query({ q: matchedData(req).text_message, project: req.chatbot_info.uuid, model:'model' })
                .end((err, res2) => {
                    if (err) {
                        res.json({ err: err.toString() })
                    }
                    let allcbres = res2.body
                    res.json({ allres: allcbres })
                })
        }

    }
)



















// get the nlu_data from this chatbot
router.get('/NLUData', (req, res) => {

    getNLUdataFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

// post the nlu_data
router.post(
    '/NLUData',
    [
        check('rasa_nlu_data', 'rasa_nlu_data for the chatbot project is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {
        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            updateNLUDataForChatbot(
                req.chatbot_info.uuid,
                matchedData(req).rasa_nlu_data
            ).then((result) => {
                res.json({ success: true })
            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }
    }
)

// get the stories from this chatbot
router.get('/stories', (req, res) => {

    getStoriesFromChatbot(req.chatbot_info.uuid).then((result) => {
        res.json({ success: true, result: result })
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error.toString() })
    })

})

// post the stories
router.post(
    '/stories',
    [
        check('stories', 'stories for the chatbot project is missing').exists().isLength({ min: 1 })
    ],
    (req, res) => {
        // checking the results
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            // if request datas is incomplete or error, return error msg
            return res.status(422).json({ success: false, errors: errors.mapped() })
        }
        else {
            updateStoriesForChatbot(
                req.chatbot_info.uuid,
                matchedData(req).stories
            ).then((result) => {
                res.json({ success: true })
            }).catch((error) => {
                return res.status(422).json({ success: false, errors: error })
            })
        }
    }
)

// train my dialogue using nlu_data
router.post('/nlutraining', (req, res) => {

    // get the nlu data first
    getNLUdataFromChatbot(req.chatbot_info.uuid).then((result) => {

        // ask for training
        request
            .post('nluserver:5000/train?project=' + req.chatbot_info.uuid + '&fixed_model_name=model&pipeline=spacy_sklearn')
            .set('contentType', 'application/json; charset=utf-8')
            .set('dataType', 'json')
            .send({
                rasa_nlu_data: result.rasa_nlu_data
            })
            .end((err, res2) => {
                if(err) {
                    return res.status(422).json({ success: false, errors: err })
                }
                res.json({ success: true })
            })

    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error.toString() })
    })

})

// dialogue training status
router.post('/nlustatus', (req, res) => {
    // ask for nlu training status
    request
        .get('nluserver:5000/status')
        .end((err, res2) => {
            if (err) {
                return res.status(422).json({ success: false, errors: err })
            }

            res.json({ success: true, result: res2.body.available_projects[req.chatbot_info.uuid] })
        })
})

// train my chatbot
router.post('/domaintraining', (req, res) => {
    // train nlu + domain + stories

    // send domain json to my coreserver.. it will convert to .yml format
    // convert stories json to .md format before sending to my coreserver

    chatbotTraining(req.chatbot_info.uuid).then((result) => {

        request
            .post('coreserver/training')
            .set('contentType', 'application/json; charset=utf-8')
            .set('dataType', 'json')
            .send({
                projectName: req.chatbot_info.uuid,
                domain: result.domain,
                stories: result.stories
            })
            .end((err, res2) => {
                if (err) {
                    return res.status(422).json({ success: false, errors: err })
                }
                res.json({ success: true, result: res2.body })
            })

    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

module.exports = router
