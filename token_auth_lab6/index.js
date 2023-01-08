const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request');
const port = 3000;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/login', (req, res) => {
	
	let code = req.query.code;
	
	if(code){
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
				grant_type: 'authorization_code',
				redirect_uri: 'http://localhost:3000/login',
				client_id: 'rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp',
				client_secret: 'rZp4V7c1hRyOr5XZVFjJJqbVkeYJwpP_lLefpNt3Zwm8qhwr0-WKsiJp4ExZpXIZ',
				code: code,
				scope: 'offline_access'
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
				
				console.log(response.statusCode);
		
				if (!error && response.statusCode == 200) {
					res.sendFile(path.join(__dirname+'/index.html'));   
				}	
				
			});
		}	
	});
	return;
	}
});

app.get('/', (req, res) => {
	return res.redirect(
        "https://dev-mrjcl7vj5v67fyvm.us.auth0.com/authorize?client_id=rChi9J9dvsxcVhvKNwQPEENw8HG8VIEp"+
		"&scope=offline_access"+ 
		"&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin"+
		"&response_type=code"+
		"&response_mode=query");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})