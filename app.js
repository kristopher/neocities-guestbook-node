
/**
 * Module dependencies.
 */

var express = require('express'),
  http = require('http'),
  path = require('path'),
  url = require('url'),
  app = express(),
  redis = require('redis'),
  redis_url = url.parse('redis://localhost:6379'),
  db;
  
module.exports = {
  db: function() {
    return db;
  },
  app: function() {
    return app;
  }
}

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
} else if ('production' == app.get('env')) {
  redis_url = url.parse(process.env['REDISCLOUD_URL']);
}

function isValidReferer(referer) {
  if ('development' == app.get('env')) {
    return true;
  }
  return /\.neocities\.org$/.test(referer);
}

// Redis
db = redis.createClient(redis_url.port, redis_url.hostname);

if (redis_url.auth) {
  db.auth(redis_url.auth.split(/\:/)[1]);
}

var Entry = require('./models/entry');

// Set CORS header
function set_cors(req, res, next) {
  req.origin = req.headers['origin'];
  if (req.origin && isValidReferer(url.parse(req.origin).hostname)) {
    res.set('Access-Control-Allow-Origin', req.origin);
  }
  next();
}

function set_default_referer(req, res, next) {
  if ('development' == app.get('env')) {
    req.headers['referer'] = ("http://" + app.get('env') + '.neocities.org');
  }
  next();
}

// Set referer
function require_referer(req, res, next) {
  if (req.headers['referer']) {
    req.referer = url.parse(req.headers['referer']).hostname;
    next();
  } else {
    res.statusCode = 404;
    res.end('');
  }
}

// Set subdomain
function set_subdomain(req, res, next) {
  req.subdomain = req.referer.split(/\./)[0];
  next();
}

// Set content type
function set_content_type(req, res, next) {
  res.set('Content-Type', 'application/json');
  next();
}

var middleware = [
  set_cors,
  set_default_referer,
  require_referer,
  set_subdomain,
  set_content_type
];

app.get('/', middleware, function(req, res, next) {
  Entry.get(req.subdomain, req.param('page') || 1, function(reply) {
    res.statusCode = 200;
    if (reply) {
      res.end("[" + reply.join(',') + "]");  
    } else {
      res.end();
    }
  }, function(err) {
    console.error(err);
    res.statusCode = 500;
    res.end("[]");
  });
});

app.post('/', middleware,  function(req, res, next) {
  var entry = new Entry({
    subdomain: req.subdomain,
    name: req.param('name'),
    message: req.param('message')
  });
  if (entry.isValid()) {
    entry.save(function() {
      res.statusCode = 201;
      res.end(entry.toJSON())
    }, function(err) {
      console.error(err);
      res.statusCode = 500;
      res.end('[]');
    });
  } else {
    res.statusCode = 422
    res.end(JSON.stringify({
      errors: entry.errors
    }));
  }
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
