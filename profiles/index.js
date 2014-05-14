var PROFILE_SEARCH_API_LINK = 'http://profiles.sc-ctsi.org/ProfilesSearchAPI/ProfilesSearchAPI.svc/Search';
var PROFILE_CONCEPT_CLASS_GROUP_URI = "http://profiles.catalyst.harvard.edu/ontology/prns#ClassGroupConcepts";
var PROFILE_PUBLICATION_CLASS_GROUP_URI = "http://profiles.catalyst.harvard.edu/ontology/prns#ClassGroupResearch";
var PROFILE_YEAR_PROPERTY_URI = "http://profiles.catalyst.harvard.edu/ontology/prns#year"

var
      request       = require('request')
    , xmlbuilder    = require('xmlbuilder')
    , xmldom        = require('xmldom')
    , domParser     = new xmldom.DOMParser()
    , Promise       = require('node-promise')
;

var pc = {}

function updateConceptCountsFromRdf(rdf, id, promise) {
    var promises = new Array();
    var xmlDoc = domParser.parseFromString(rdf);
    var subAreas = xmlDoc.getElementsByTagName('vivo:hasSubjectArea');

    for (var i = 0; i < subAreas.length; ++ i) {
        promises.push(server.dbClient.incrementConceptCount(
            subAreas[i].attributes.getNamedItem('rdf:resource')));
    }

    /* 
     * wait for all the concept counts to get updated and then mark this
     * publication as done...
     */
    Promise.allOrNone(promises).then(function () {
        server.dbClient.markPubAsProcessed(id).then(function () {
            promise.resolve();
        }, function () {
            promise.reject();
        });
    }, function (err) {
        server.log.error("Failed to update concept count!!!\nError Msg: " + err);
    });
}

function requestPubRdf(pub) {
    var promise = new Promise.Promise();
    var url = pub[1]
        + "/"
        + pub[1].substring(pub[1].lastIndexOf("/") + 1)
        + ".rdf"
    ;

    server.log.info("Requesting RDF: " + url);

    request({
        url:            url,
        method:         "GET",
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            updateConceptCountsFromRdf(body, pub[0], promise);
        } else {
            server.log.error(response.headers);
            server.log.error(response.statusCode);
            server.log.error(body);
            promise.reject();
        }
    });

    return promise;
}

var requestProfiles = function (reqXml, resProcessor) {
    var promise = new Promise.Promise();

    request({
        url:            PROFILE_SEARCH_API_LINK,
        method:         "POST",
        headers:        { "Content-Type":    "text/xml" },
        body:           reqXml
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            promise.resolve(resProcessor(body));
        } else {
            server.log.error(response.headers);
            server.log.error(response.statusCode);
            server.log.error(body);
            promise.reject();
        }
    });

    return promise;
}

var forEachProfilesResult = function (xmlString, processor) {
    var xmlDoc = domParser.parseFromString(xmlString);
    var numberOfConnections = xmlDoc.getElementsByTagName('prns:numberOfConnections')[0];

    server.log.info(
          "numberOfConnections : "
        + numberOfConnections.childNodes[0].nodeValue
    );
    
    if (numberOfConnections && numberOfConnections.childNodes[0].nodeValue > 0) {
        var descList = xmlDoc.getElementsByTagName('rdf:Description');
        for (var i = 0; i < descList.length; ++ i) {
            if (descList[i].attributes.getNamedItem('rdf:nodeID')) {
                if (descList[i].attributes.getNamedItem('rdf:nodeID').nodeValue.match(/^C\d/g)) {
                    processor(descList[i]);
                }
            }
        }
    }
}

pc.listAllConcepts = function () {
    var domParser = new xmldom.DOMParser();
    
    var createRequest = function () {
        return xmlbuilder.create({
            SearchOptions: {
                MatchOptions: {
                    SearchString: {
                        '@ExactMatch': 'false',
                    },
                    ClassGroupURI: PROFILE_CONCEPT_CLASS_GROUP_URI,
                }
            }
        }, { headless: true })
        .end();
    };
    
    var parseResponse = function (xmlString) {
        var conceptList = new Array();

        forEachProfilesResult(xmlString, function (result) {
            conceptList.push({
                profilesId :    result
                                    .getElementsByTagName('rdf:object')[0]
                                    .attributes.getNamedItem('rdf:resource')
                                    .nodeValue,
                name :          result
                                    .getElementsByTagName('rdfs:label')[0]
                                    .childNodes[0]
                                    .nodeValue
            });
        });

        return conceptList;
    };

    return requestProfiles(createRequest(), parseResponse);
}

pc.listAllPubInYear = function (year) {
    var domParser = new xmldom.DOMParser();
    
    var createRequest = function () {
        var str = xmlbuilder.create({
            SearchOptions: {
                MatchOptions: {
                    SearchString: {
                        '@ExactMatch': 'false'
                    },
                    ClassGroupURI: PROFILE_PUBLICATION_CLASS_GROUP_URI,
                    SearchFiltersList: {
                        SearchFilter: {
                            '@IsExclude': '0',
                            '@Property': PROFILE_YEAR_PROPERTY_URI,
                            '@MatchType': 'Exact',
                            '#text': '' + year
                        }
                    }
                }
            }
        }, { headless: true })
        .end();

        server.log.info(str);

        return str;
    };
    
    var parseResponse = function (xmlString) {
        var pubList = new Array();

        forEachProfilesResult(xmlString, function (result) {
            pubList.push({
                profilesId :    result
                                    .getElementsByTagName('rdf:object')[0]
                                    .attributes.getNamedItem('rdf:resource')
                                    .nodeValue,
            });
        });

        return pubList;
    };

    return requestProfiles(createRequest(), parseResponse);
}

pc.incrementSubjectAreaCount = function (pub) {
    return requestPubRdf(pub);
}

server = module.parent.exports.server;

/* add profiles client to server object... */
server.profilesClient = pc;
