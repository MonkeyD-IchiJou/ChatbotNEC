const router = require('express').Router()
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
var jwt = require('jsonwebtoken') // sign with default (HMAC SHA256)
var nodemailer = require('nodemailer')
var { Database } = require('../../database')
const bcrypt = require('bcryptjs')

const saltRounds = 10
const confirmationUrl = "https://localhost/auth/v1/confirm"
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.email,
        pass: process.env.email_password
    }
})

// return promise to sign a jwt for the user confirmation email
var signConfirmJWT = (user_email) => {

    return new Promise((resolve, reject) => {

        // will be expire in 6 hours
        // sign a confirmation token first
        let token = jwt.sign({ data: { 'e': user_email, 'ct': true } }, process.env.jwtSecret, { expiresIn: '6h' });

        if (token) {
            resolve(token)
        }
        else {
            reject("token not generated for some reason, server error")
        }

    })

}

// return promise to sign a jwt for the user if trusted
var signLoginJWT = (user_id) => {

    return new Promise((resolve, reject) => {

        // rmb generate a new jwt to user
        // will be expire in 24 hours
        let token = jwt.sign({ data: { 'i': user_id, 'si': true } }, process.env.jwtSecret, { expiresIn: '24h' })

        if (token) {
            resolve(token)
        }
        else {
            reject("token not generated for some reason, server error")
        }

    })

}

// send an email to user for confirmation
var sendConfirmationEmail = (user_email) => {

    return new Promise(async (resolve, reject) => {

        try {
            // sign a confirmation token first
            let jwt = await signConfirmJWT(user_email)

            // then send the email to the user with the token parameters
            let mailOptions = {
                from: process.env.email,
                to: user_email,
                subject: 'Sending Email using Node.js',
                html: `<h1>Welcome</h1><p>Confirm this registration pls 2</p><a href=${confirmationUrl + '?ctoken=' + jwt} target="_blank">Confirm</a>`
            }

            let mail_result = await transporter.sendMail(mailOptions)
            resolve(mail_result)

        }
        catch (e) {
            reject(e)
        }

    })

}

// user registration method
var userRegistration = (user_submit) => {
    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT EXISTS(SELECT * FROM users WHERE email=?) AS solution',
                'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
                'SELECT id FROM users WHERE email=?',
                'INSERT INTO users_plans(user_id, plan_id) VALUES (?, ?)'
            ]
            // all possible errors
            const register_errors = [
                'db error cannot find solution',
                'email alr exist in db'
            ]

            let first_result_row = ''

            {
                // first check whether this email alr exist in the db or not
                let result_row = await database.query(sql_queries[0], [user_submit.email])
                first_result_row = result_row[0]
            }

            if (!first_result_row) {
                // for some reason, db return null for my solution
                throw register_errors[0]
            }

            if (first_result_row.solution) {
                // if email alr in used, then throw error
                throw register_errors[1]
            }

            // prepare to register this user into my db

            // hash the user password first
            let hash_pw = await bcrypt.hash(user_submit.password, saltRounds)

            // successfully hashed password; store user in DB
            let store_result = await database.query(sql_queries[1], [user_submit.email, user_submit.username, hash_pw])

            // has alr successfully stored this user in the db

            // find the id
            let user_id = await database.query(sql_queries[2], [user_submit.email])

            // auto register a plan for this user
            let register_plan_result = await database.query(sql_queries[3], [user_id[0].id, 1])

            // then finally send the confirmation email
            let mail_result = await sendConfirmationEmail(user_submit.email)

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

// user login async method.. will return a jwt if everything success
var userLoginJwt = (user_submit, cb) => {
    return new Promise(async (resolve, reject) => {

        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'SELECT * FROM users WHERE email=?',
                'UPDATE users SET lastlogin=CURRENT_TIMESTAMP WHERE email=?'
            ]
            // all possible errors
            const login_errors = [
                'email not found in db',
                'user has not yet confirm their email',
                'password is incorrect'
            ]

            // firstly, get the sql query info for this user by using email 
            const user_row = await database.query(sql_queries[0], [user_submit.email])

            // select the first query
            const user_select = user_row[0]

            if (!user_select) {
                // if cannot find any user based on this email, then throw error
                throw login_errors[0]
            }

            if (!user_select.confirm) {
                // if user not yet confirm their email, throw error
                throw login_errors[1]
            }

            // user has alr confirmed their email

            // get the hash password from the db query
            // compare it with bcrypt
            let hashpw_compare = await bcrypt.compare(user_submit.password, user_select.password.toString())

            if (!hashpw_compare) {
                // if password is incorrect, throw an error
                throw login_errors[2]
            }

            // if password is correct

            // sign the jwt and update the user last login 
            let all_results = await Promise.all([
                signLoginJWT(user_select.id), // sign the login jwt
                database.query(sql_queries[1], [user_select.email]) // update the user last login info
            ])

            // resolve the jwt
            resolve(all_results[0])

        }
        catch (e) {
            // reject the error
            reject(e.toString())
        }

        // rmb to close the db
        let dbclose = await database.close()
    })
}

// check user confirmation or not
var updateUserConfirmation = (user_email) => {
    return new Promise(async (resolve, reject) => {

        // then update db about confimation
        // connect to mariadb/mysql
        let database = new Database()

        try {
            // all necessary sql queries
            const sql_queries = [
                'UPDATE users SET confirm=1 WHERE email=(?)'
            ]
            // all possible errors
            const register_errors = [
            ]

            // set the confirmation
            let result_row = await database.query(sql_queries[0], [user_email])

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

router.post(
    '/register',
    [
        check('email').isEmail().withMessage('must be an email'),
        check('password', 'passwords must be at least 5 chars long and contain one number').isLength({ min: 5 }).matches(/\d/).custom((value, { req, loc, path }) => {
            if (value !== req.body.re_password) {
                // throw error if passwords do not match
                throw new Error("Passwords don't match");
            } else {
                return value;
            }
        }),
        check('username', 'must have a username').exists().isLength({ min: 1 })
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // if post datas is incomplete or error, return error msg
            return res.status(422).json({ success: "false", errors: errors.mapped() });
        }
        else {

            // get the matched data
            const user = matchedData(req);

            userRegistration({ email: user.email, password: user.password, username: user.username }).then(() => {

                // successfully registered
                res.setHeader('Content-type', 'application/json');
                res.send(JSON.stringify({ success: 'true', msg: 'pls check email for confirmation' }))

            }).catch((error) => {

                return res.status(422).json({ success: 'false', errors: error })

            })

        }
    }
)

router.post(
    '/',
    [
        check('email').isEmail().withMessage('must be an email'),
        check('password', 'passwords cannot be empty').isLength({ min: 1 })
    ],
    (req, res) => {

        // checking the results
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // if post datas is incomplete or error, return error msg
            return res.status(422).json({ authResult: false, errors: errors.mapped() });
        }
        else {

            // get the matched data
            const user = matchedData(req);

            // user request sign in
            userLoginJwt({ email: user.email, password: user.password }).then((jwt) => {

                res.setHeader('Content-type', 'application/json')
                res.send(JSON.stringify({ authResult: true, jwt: jwt }))

            }).catch((error) => {

                return res.status(422).json({ authResult: false, errors: error });

            })

        }

    }
)

router.get('/confirm', (req, res) => {
    // get the confirmation token
    let ctoken = req.query.ctoken;

    if (ctoken) {

        // first check for token validation
        jwt.verify(ctoken, process.env.jwtSecret, (err, decoded) => {

            if (err) {
                // json token maybe expired
                return res.json({ success: false, errors: { jwt: 'json web token validate error, registration not successful' } });
            }
            else {

                if (decoded.data.ct) {

                    updateUserConfirmation(decoded.data.e).then(() => {

                        // successfully update the user confirmation
                        res.send('Thank you for joining! ' + decoded.data.e);

                    }).catch((error) => {

                        // update confirmation not successfull
                        res.send(error);

                    })

                }
                else {
                    res.send('Invalid Token, u hacka?');
                }

            }

        });

    }
    else {
        res.send('Invalid Token, u hacka?');
    }

})

module.exports = router