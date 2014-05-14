var 
      restify           = require('restify')
    , bunyan            = require('bunyan')
    , PrettyStream      = require('bunyan-prettystream')
    , pg                = require('pg')
;

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var server = restify.createServer({
    log:    bunyan.createLogger({
          name: "profile_search"
        , streams: [{
              level: 'debug'
            , type: 'raw'
            , stream: prettyStdOut
        }]
    })
});

/* Event handlers */
server.on('uncaughtException', function (req, res, route, error) {
    server.log.error(error);
    res.send(500);
});

var port = Number(process.env.PORT || 8081);
server.listen(port, function() {
    server.log.info('%s listening at %s', server.name, server.url);
});

/*
 * Export the restify app for other modules to use...
 */
module.exports.server = server;

require('./db');
require('./profiles');
require('./routes');
