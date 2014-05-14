var
      pg        = require('pg')
    , Promise   = require('node-promise')
;

var DATABASE_URL = "postgres://anirudha:anni@localhost/profiles_data_mining";

var dbPromise = new Promise.Promise();
var dbClient = new pg.Client(DATABASE_URL);
dbClient.connect(function (err) {
    if (err) {
        dbPromise.reject("Failed to connect to db!!!\nError Msg: " + err);
    } else {
        dbPromise.resolve();
    }
});

function query(text, errMsg, resultProcessor) {
    var promise = new Promise.Promise();

    /* DEBUG */
    server.log.info("Executing: " + text);

    dbClient.query(text, function (err, result) {
        if (err) {
            promise.reject(errMsg + "\nError Msg: " + err);
        } else {
            /* DEBUG */
            server.log.info(JSON.stringify(result));
            promise.resolve(resultProcessor ? resultProcessor(result) : null);
        }
    });

    return promise;
}

function paramQuery(text, params, errMsg, resultProcessor) {
    var promise = new Promise.Promise();

    /* DEBUG */
    server.log.info("Executing: " + text);

    dbClient.query(text, params, function (err, result) {
        if (err) {
            promise.reject(errMsg + "\nError Msg: " + err);
        } else {
            /* DEBUG */
            server.log.info(JSON.stringify(result));
            promise.resolve(resultProcessor ? resultProcessor(result) : null);
        }
    });

    return promise;
}

dbClient.isSchemasExist = function () {
    return query(
      "SELECT exists(                               "
    + "    SELECT table_name                        "
    + "        FROM information_schema.tables       "
    + "        WHERE table_name = 'publications')   "
    , "Failed to find table!!!"
    , function (result) {
        return result.rows[0][result.fields[0].name];
    });
}

dbClient.createTables = function () {
    return Promise.allOrNone([
        query(
          "CREATE TABLE publications(                           "
        + "     id              serial          primary key,    "
        + "     profiles_id     varchar(200)    NOT NULL,       "
        + "     processed       boolean         DEFAULT false)  "
        , "Failed to create table!!!"),
        query(
          "CREATE TABLE concepts(                               "
        + "     id              serial          primary key,    "
        + "     profiles_id     varchar(200)    not null,       "
        + "     name            varchar(200)     not null,       "
        + "     pub_count       int DEFAULT 0)                  "
        , "Failed to create table!!!")
    ]);
}

dbClient.populateConcepts = function (concepts) {
    var paramIdx = 0;
    var params = new Array();
    var insert_sql = "INSERT into concepts (profiles_id, name) VALUES";

    concepts.forEach(function (concept, index) {
        var concString = "($" + (paramIdx ++ + 1) + ",$" + (paramIdx ++ + 1) + ")";
        params.push(concept.profilesId);
        params.push(concept.name);
        
        if (index != (concepts.length - 1)) {
            concString += ",";
        }

        insert_sql += concString;
    });

    return paramQuery(insert_sql, params, "Failed to insert into concepts!!!");
}

dbClient.populatePubs = function (pubs) {
    var paramIdx = 0;
    var params = new Array();
    var insert_sql = "INSERT into publications (profiles_id) VALUES";

    pubs.forEach(function (pub, index) {
        var pubString = "($" + (paramIdx ++ + 1) + ")";
        params.push(pub.profilesId);
        
        if (index != (pubs.length - 1)) {
            pubString += ",";
        }

        insert_sql += pubString;
    });

    return paramQuery(insert_sql, params, "Failed to insert into concepts!!!");
}

server = module.parent.exports.server;

/* set db client... */
server.dbClient = dbClient;

/* export the promise... */
module.exports = dbPromise;
