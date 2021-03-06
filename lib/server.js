// Primary file for the API
// Dependencies 
var http = require("http");
var https = require("https");
var url = require('url');
var StringDecoder = require("string_decoder").StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require("./helpers");
var path = require('path');
//object to export
var server = {};

// The server should respond to all requests with a string
//Port 3000
//Instantiate the HTTP server
server.httpServer = http.createServer((req,res)=>{
    server.unifiedServer(req,res);
});

//Instanatiate the HTTPS server
server.httpsServerOptions = {
    "key": fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    "cert":fs.readFileSync(path.join(__dirname,'/../https/certificate.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions,(req,res)=>{
    server.unifiedServer(req,res);
});
//start the HTTPS server

//all the  server logic for both the http and https server
server.unifiedServer=(req,res)=>{
    var parsedUrl = url.parse(req.url,true);
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,"");
    var method = req.method.toLowerCase();
    var queryStringObject = parsedUrl.query;
    var headers = req.headers;

    // Get payload from the request
    var decoder = new  StringDecoder ("utf-8");

    var buffer = "";
    req.on('data',(data)=>{
        buffer += decoder.write(data);
    });
    req.on("end",()=>{
        buffer +=decoder.end();
        console.log(trimmedPath)
        var chosenHandler = typeof(server.router[trimmedPath])!=='undefined'? server.router[trimmedPath]:handlers.notFound;
        //construct the data object to sent to the handler

        //if the request is within the public directory,
        chosenHandler = trimmedPath.indexOf('public/')>-1?handlers.public : chosenHandler;
        var data={
            "trimmedPath":trimmedPath,
            "queryStringObject":queryStringObject,
            "method":method,
            "headers":headers,
            "payload":helpers.parseJsonToObject(buffer)
        };
        //router the request to the handler specified in the router
        chosenHandler(data,(statusCode,payload,contentType)=>{
            //use the status code called back by the handler or use default 200
            //use the payload in the called function or use the default as an empty object
            statusCode=typeof(statusCode)=='number'?statusCode:200;  

            //Determine the type of response (fallback to JSON)
            contentType = typeof(contentType)==='string'? contentType :'json'

            //return the response parts that are content-specific
            var payloadString ="";
            if(contentType == 'json'){
                res.setHeader('Content-Type','application/json');
                payload = typeof(payload)=='object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }
            if(contentType =='html'){
                res.setHeader('Content-Type','text/html');
                payloadString = typeof(payload)=="string"?payload:''
            }
            if(contentType =='favicon'){
                res.setHeader('Content-Type','image/x-icon');
                payloadString = typeof(payload)!=="undefined"?payload:''
            }
            if(contentType =='css'){
                res.setHeader('Content-Type','text/css');
                payloadString = typeof(payload)!=="undefined"?payload:''
            }
            if(contentType =='png'){
                res.setHeader('Content-Type','image/png');
                payloadString = typeof(payload)!=="undefined"?payload:''
            }
            if(contentType =='jpg'){
                res.setHeader('Content-Type','image/png');
                payloadString = typeof(payload)!=="undefined"?payload:''
            }
            if(contentType =='plain'){
                res.setHeader('Content-Type','text/plain');
                payloadString = typeof(payload)!=="undefined"?payload:''
            }
            //return the response parts that are common to all content-types

            res.writeHead(statusCode);
            res.end(payloadString);

            console.log("Returning this response",statusCode);
        });

    });
};

server.router = {
    "":handlers.index,
    "account/create":handlers.accountCreate,
    "account/edit":handlers.accountEdit,
    "account/deleted":handlers.accountDeleted,
    "session/create":handlers.sessionCreate,
    "session/deleted":handlers.sessionDeleted,
    "checks/all":handlers.checksList,
    "checks/create":handlers.checksCreate,
    "check/edit":handlers.checksEdit,
    "ping":handlers.ping,
    "api/users":handlers.users,
    "api/tokens":handlers.tokens,
    "api/checks":handlers.checks,
    "favicon.ico":handlers.favicon,
    "public":handlers.public
};

server.init = ()=>{
    server.httpServer.listen(config.httpPort,()=>{
        console.log("The server is listerning at port ",config.httpPort+" in ",config.envName," mode");
    }); 

    server.httpsServer.listen(config.httpsPort,()=>{
        console.log("The server is listerning at port ",config.httpsPort+" in ",config.envName," mode");
    });

};

module.exports = server;