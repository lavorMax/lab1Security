const uuid = require('uuid');
const jwt = require("jsonwebtoken");
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request');
const port = 3000;
const fs = require('fs');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const errorHandler = (error, request, response, next) => {
  return response.sendFile(path.join(__dirname+'/index.html'));
};

const checkJwt = auth({
  audience: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/api/v2/',
  issuerBaseURL: `https://dev-mrjcl7vj5v67fyvm.us.auth0.com`,
});

const SESSION_KEY = 'Authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});


app.get('/', (req, res) => {
	
	let auth = req.get("Authorization");
	
	const decoded = jwt.decode(auth);
	
	let date = Date.now();
	
	if(decoded.exp - date/1000 < 2){
		let details = {
				grant_type: 'refresh_token',
				client_id: 'rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp',
				client_secret: 'rZp4V7c1hRyOr5XZVFjJJqbVkeYJwpP_lLefpNt3Zwm8qhwr0-WKsiJp4ExZpXIZ',
				refresh_token: req.get("RToken"),
			};
	
			let user_options = {
				uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/oauth/token',
				body: JSON.stringify(details),
				method: 'POST',
				headers: {
							'Content-Type': 'application/json',
						}
			};
	
			request(user_options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var body_res = JSON.parse(body);
					return res.json({ token: body_res.access_token,
							   refresh_token: req.get("RToken") });
				}	
				else{
					res.status(401).send();
				}
			});
	}
	else{
		const options = { 
		  method: "GET",
		  uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/userinfo',
		  headers: { "Authorization": "Bearer " + auth }
		};
		
		request(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var body_res = JSON.parse(body);
					return res.json({
						username: body_res.nickname,
						logout: 'http://localhost:3000/logout'
					});
				}
				else{
					res.status(401).send();
				}
		});
	}
});

app.get('/private', checkJwt, (req, res) =>{
	res.json({
        message: 'you have private access'
    })
});

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

app.post('/api/create', (req, res) => {
	const { login, fname, sname, nname, password } = req.body;
	
	let details = {
		audience: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/api/v2/',
		grant_type: 'client_credentials',
		client_id: 'rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp',
		client_secret: 'rZp4V7c1hRyOr5XZVFjJJqbVkeYJwpP_lLefpNt3Zwm8qhwr0-WKsiJp4ExZpXIZ'
	};
	
	let options = {
        uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/oauth/token',
		body: JSON.stringify(details),
        method: 'POST',
		headers: {
                    'Content-Type': 'application/json'
                }
    };
	
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
		    let user_details = {
				verify_email: false,
				email: login,
				password: password,
				connection: 'Username-Password-Authentication',
				user_id: fname+sname,
				nickname: nname,
				given_name: fname,
				family_name: sname,
				email_verified: false,
				blocked: false
			};
			var body_res = JSON.parse(body);
			let user_options = {
				uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/api/v2/users',
				body: JSON.stringify(user_details),
				method: 'POST',
				headers: {
							'Content-Type': 'application/json',
							'Authorization' : 'Bearer ' + body_res.access_token
						}
			};
	
			request(user_options);
		}	
	});
	res.status(500).send()
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    let details = {
		audience: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/api/v2/',
		grant_type: 'client_credentials',
		client_id: 'rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp',
		client_secret: 'rZp4V7c1hRyOr5XZVFjJJqbVkeYJwpP_lLefpNt3Zwm8qhwr0-WKsiJp4ExZpXIZ'
	};
	
	let options = {
        uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/oauth/token',
		body: JSON.stringify(details),
        method: 'POST',
		headers: {
                    'Content-Type': 'application/json'
                }
    };
	
	request(options, function (error, response, body) {
		if(error){
			res.status(401).send();
		}
		if (!error && response.statusCode == 200) {
		
		    let user_details = {
				grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
				username: login,
				password: password,
				audience: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/api/v2/',
				client_id: 'rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp',
				client_secret: 'rZp4V7c1hRyOr5XZVFjJJqbVkeYJwpP_lLefpNt3Zwm8qhwr0-WKsiJp4ExZpXIZ',
				realm: 'Username-Password-Authentication',
				scope: 'offline_access openid'
			};
	
			let user_options = {
				uri: 'https://dev-mrjcl7vj5v67fyvm.us.auth0.com/oauth/token',
				body: JSON.stringify(user_details),
				method: 'POST',
				headers: {
							'Content-Type': 'application/json',
							'Authorization' : 'Bearer ' + body.access_token
						}
			};
	
			request(user_options, function (error, response, body) {
				if(error){
					res.status(401).send();
				}
		
				if (!error && response.statusCode == 200) {
					var body_res = JSON.parse(body);
					res.json({ token: body_res.access_token,
							   refresh_token: body_res.refresh_token });
				}	
			});
		}	
	});
});

app.use(errorHandler)

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})