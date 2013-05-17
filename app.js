
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , feed = require('./routes/feed')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , querystring = require("querystring")
  , OAuth = require('oauth').OAuth
  , oauth = new OAuth(
        "https://api.twitter.com/oauth/request_token",
        "https://api.twitter.com/oauth/access_token",
        "KnJK9LvwtADJ8MuYGNQaw",
        "YnPkIJ7YH9Wtmy8qazJuTkxXKFBKFNtB2bHpHAedVK8",
        "1.0",
        "http://localhost:3000/auth/twitter/callback",
        "HMAC-SHA1"
    )
  , socketio = require('socket.io')

var app = express();


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = app.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
var io = socketio.listen(server);

app.get('/auth/twitter', function(req, res) {
    oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
        if (error) {
            console.log(error);
            res.send("Authentication Failed!");
        }
        else {
            req.session.oauth = {
                token: oauth_token,
                token_secret: oauth_token_secret
            };
            console.log(req.session.oauth);
            res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token);
        }
    })
})

app.get('/auth/twitter/callback', function(req, res, next) {
    if (req.session.oauth) {
        req.session.oauth.verifier = req.query.oauth_verifier;
        var oauth_data = req.session.oauth;

        oauth.getOAuthAccessToken(
            oauth_data.token,
            oauth_data.token_secret,
            oauth_data.verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    console.log(error);
                    res.send("Authentication Failure!");
                }
                else {
                    req.session.oauth.access_token = oauth_access_token;
                    req.session.oauth.access_token_secret = oauth_access_token_secret;
                    console.log(results, req.session.oauth);

                    res.render('feed', { title: 'Twitter feed' });

                    io.sockets.on('connection', function(socket) {
                        var request = oauth.get("https://stream.twitter.com/1/statuses/sample.json", oauth_access_token, oauth_access_token_secret );

                        request.addListener('response', function (response) {
                            response.setEncoding('utf8');
                            response.addListener('data', function (chunk) {
                                socket.emit('newTweet', chunk);
                                console.log(chunk);
                            });
                            response.addListener('end', function () {
                                console.log('--- END ---');
                            });
                        });
                        request.addListener('error', function(e) {
                            console.log('error: ' + e);
                        });
                        request.end();
                    })
                }
            }
        );
    }
    else {
        res.redirect('/login'); // Redirect to login page
    }
})

app.get('/', routes.index);
app.get('/users', user.list);
//app.get('/feed', feed.main);



