const router = require('express').Router()
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')

// temp only.. remove it in production
/*process.env.MASQL_HOST = 'localhost'
process.env.MYSQL_DATABASE = 'NECAIDB'
process.env.MYSQL_USER = 'necaidbuser'
process.env.MYSQL_PASSWORD = 'NECAIDBuser20171020'
process.env.jwtSecret = 'soseCREToMg8228'
*/
var { Database } = require('../../database')

// get the live chat info based on this uuid
var getUserInfo = (user_id) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT * FROM users WHERE id=?'
            ]

            // all possible errors
            const db_errors = [
                'no such registered user in db'
            ]

            // delete this intent
            let row_user = await database.query(sql_queries[0], [user_id])

            if (!row_user[0]) {
                throw db_errors[0]
            }

            // return the user info
            let userinfo = {
                id: row_user[0].id,
                email: row_user[0].email,
                username: row_user[0].username,
                joindate: row_user[0].joindate
            }
            resolve(userinfo)

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
var userLogout = (user_id) => {

    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'UPDATE users SET login=0 WHERE id=?'
            ]

            // all possible errors
            const db_errors = [
                'no such registered user in db'
            ]

            // update this login
            let row_updatelogin = await database.query(sql_queries[0], [user_id])

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

router.post('/', (req, res) => {

    getUserInfo(req.decoded.data.i).then((userinfo) => {

        // send the result back to client
        res.setHeader('Content-type', 'application/json')
        res.send(JSON.stringify({ success: true, userinfo: userinfo }))

    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

router.get('/logout', (req, res) => {

    userLogout(req.decoded.data.i).then(() => {
        // send the result back to client
        res.setHeader('Content-type', 'application/json')
        res.send(JSON.stringify({ logout: true }))
    }).catch((error) => {
        return res.status(422).json({ success: false, errors: error })
    })

})

module.exports = router