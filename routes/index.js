var
      findPubCountOnConceptForYear = require('./pub_count/concept/year')
;

server = module.parent.exports.server;

/* set routes... */
server.get(/^\/pub_count\/concept\/year\/(\d{4})/, findPubCountOnConceptForYear);
