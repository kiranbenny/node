
//Dependencies
var crypto = require('crypto');
var config = require('./config');
var helpers = {};
var querystring = require('querystring');
var https = require('https');
//create a SHA256 hash

helpers.hash =(str)=>{
    if (typeof(str) == 'string' && str.length >0){
        
        var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        
        return hash;

    }else{
        return false;
    }
};

//Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str)=>{
    try{
        var object = JSON.parse(str);
        return object;
    }catch{
        return {};
    }
}

helpers.createRandomString=(strLength)=>{
    strLength = typeof(strLength)=='number' && strLength >0 ?strLength:false;
    if(strLength){
        //Define all the possible characters that go into the string
        var possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123465789";
        //Start the string
        var str = "";
        for(i=1;i<=strLength;++i){
            //get random character from the possible character string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random()*possibleCharacters.length));
            //append this character to the final string
            str+=randomCharacter;
        }
        //return the string
        return str;
    }else{
        return false;
    }
}

//Send an SMS message via Twilio
helpers.sendTwilioSms = (phone,msg,callback)=>{
    //validate parameter
    phone = typeof(phone) =='number' && phone.toString().length ==10 ? phone : false;
    msg = typeof(msg) =='string' && msg.trim().length>0 && msg.trim().length<=1600 ? msg.trim() : false;
    if(phone && msg){
        //config request payload
        var payload = {
            'From':config.twilio.fromPhone,
            'To':'+91'+phone,
            'Body':msg
        };

    //stringify the payload
    var stringPayload = querystring.stringify(payload);

    //configure the request details
    var requestDetails = {
        'protocol' : 'https:',
        'hostname' : 'api.twilio.com',
        'method' : 'POST',
        'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
        'auth' : config.twilio.accountSid+":"+config.twilio.authToken,
        'headers' : {
            'Content-Type':'application/x-www-form-urlencoded',
            'Content-Length':Buffer.byteLength(stringPayload)
        }
    };

    var req = https.request(requestDetails,(res)=>{
        //Grab the status of the sent request
        var status = res.statusCode;
        if(status==200||status==201){
            callback(false);
        }else{
            callback("Status code returned was "+status);
        }
    });

//Bind the error event so it doesnt get thrown
req.on('error',(e)=>{
    callback(e);
});

req.write(stringPayload);

req.end();

    }else{
        callback("given parameters were missing or not valid");
    }

};

module.exports = helpers;