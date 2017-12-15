const router = require('express').Router()
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')

// temp only.. remove it in production
/*process.env.MASQL_HOST = 'localhost'
process.env.MYSQL_DATABASE = 'NECAIDB'
process.env.MYSQL_USER = 'necaidbuser'
process.env.MYSQL_PASSWORD = 'NECAIDBuser20171020'
process.env.jwtSecret = 'soseCREToMg8228'*/

var { Database } = require('../../database')

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
    res.json({success: 'true'})
})

module.exports = router