var 
      restify   = require('restify')
    , Promise   = require('node-promise')
;

var findPubCountOnConceptForYear = function (req, res, next) {
    var errorHandler = function (err) {
        server.log.error(err);
        return next(new restify.InternalError(err));
    }

    /* Check if another task is going on... */
    server.dbClient.isSchemasExist().then(function (exists) {
        if (exists) {
            return next(new restify.ServiceUnavailableError("Already processing a request..."));
        } else {
            /* respond to http request with started... */
            res.setHeader('content-type', 'text/plain');
            res.send({ status: "started" });
            next();

            /* create tables and get concept list from Profiles... */
            Promise.allOrNone([
                server.dbClient.createTables(),
                server.profilesClient.listAllConcepts(),
                server.profilesClient.listAllPubInYear(req.params[0])
            ]).then(function (results) {
                /* populate the concepts and publications tables... */
                Promise.allOrNone([
                    server.dbClient.populateConcepts(results[1]),
                    server.dbClient.populatePubs(results[2])
                ]).then(function () {
                }, errorHandler);
            }, errorHandler);
        }
    }, errorHandler);
}

server = module.parent.exports.server;

module.exports = findPubCountOnConceptForYear;
