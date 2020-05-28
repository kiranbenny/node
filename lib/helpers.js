
//Dependencies
var crypto = require('crypto');
var config = require('./config');
var helpers = {};
var querystring = require('querystring');
var https = require('https');
var path = require('path');
var fs = require('fs');
//create a SHA256 hash






helpers.getTemplate = (templateName,data,callback)=>{
    templateName = typeof(templateName) ==='string' && templateName.length >0 ? templateName:false
    data = typeof(data) ==='object' && data !==null ? data : {};
    if(templateName){
        var templateDir = path.join(__dirname,"/../templates/");
        fs.readFile(templateDir+templateName+'.html','utf8',(err,str)=>{
            if(!err && str.length>0){
                //Do interpolation on the string
                var finalString = helpers.interpolate(str,data)
                callback(false,finalString)
            }else{
                callback(true,"The specified template not found")
            }
        })
    }else{
        callback(true,"A valid template name was not defined")
    }
};

helpers.addUniversalTemplates =(str,data,callback)=>{
    str = typeof(str) ==='string' && str.length >0 ? str:'';
    data = typeof(data) ==='object' && data !==null ? data : {};
    //Get header
    helpers.getTemplate('_header',data,(err,headerString)=>{
        if(!err && headerString){
            helpers.getTemplate('_footer',data,(err,footerString)=>{
                if(!err && footerString){
                        //Add them all together
                        var fullString = headerString+str+footerString
                        callback(false,fullString)
                    }
                else{
                    callback("Couldnot find the footer template ")
                }
            })
        }else{
            callback("Couldnot find the header template ")
        }
    })
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str,data)=>{
    str = typeof(str) ==='string' && str.length >0 ? str:'';
    data = typeof(data) ==='object' && data !==null ? data : {};

    // Add the templateGlobal do the data objects,prepending their key namm with "Global"
    for(var keyName in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data['global.'+keyName] = config.templateGlobals[keyName];
        }
    }  

    //for each key in the data object , insert its value into the string at the corresponding placeholder

    for(var key in data){
        if(data.hasOwnProperty(key) && typeof(data[key])=="string"){
            var replace = data[key];
            var find ='{'+key+'}';
            str = str.replace(find,replace);
        }
    }
    return str;
};


helpers.getStaticAsset=(fileName,callback)=>{
    fileName = typeof(fileName) ==='string' && fileName.length >0 ? fileName:false;
    if(fileName){
        var publicDir = path.join(__dirname,"../public/");
        fs.readFile(publicDir+fileName,(err,data)=>{
            if(!err && data){
                callback(false,data);
            }else{
                callback(true,"No file could be found");
            }
        })
    }else{
        callback(true,"A valid file name not foung")
    }
};







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