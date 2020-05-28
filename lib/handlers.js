
//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require("./config");
//defining a request router
var handlers={};

/*
*HTML API Handlers
*
*/

//Index Handler
handlers.index = (data,callback)=>{
    if(data.method == 'get'){

        var templateData ={
            'head.title':"This is the title",
            'head.description':"This is the meta description",
            'body.title':"Hello templated world",
            "body.class":'index'
        }
        

        //read in a template as a string
        helpers.getTemplate("index",templateData,(err,str)=>{
            if(!err && str){
                //Add the universal header and footer
                helpers.addUniversalTemplates(str,templateData,(err,str)=>{
                    if(!err && str){
                        callback(200,str,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                })
            }else{
                callback(500,str,'html');
            }
        })
    }else{
        callback(405,undefined,'html')
    }
};

//favicon

handlers.favicon = (data,callback)=>{
    if(data.method =='get'){
        //read in the favicon data
        helpers.getStaticAsset('favicon.ico',(err,data)=>{
            if (!err && data){
                callback(200,data,'favicon');
            }else{
                callback(500)
            }
        })
    }else{
        callback(405)
    }
}

//public assets
handlers.public = (data,callback)=>{
    if(data.method =='get'){
        //get the filename being requested
        var trimmedAssetName = data.trimmedPath.replace('public/','').trim();
        if(trimmedAssetName.length>0){
            //read in the assets data
            helpers.getStaticAsset(trimmedAssetName,(err,data)=>{
                if(!err && data){
                    //determine the content type 
                    var contentType = 'plain';
                    if(trimmedAssetName.indexOf('.css')>-1){
                        contentType = 'css'
                    }
                    if(trimmedAssetName.indexOf('.png')>-1){
                        contentType = 'png'
                    }
                    if(trimmedAssetName.indexOf('.jpg')>-1){
                        contentType = 'jpg'
                    }
                    if(trimmedAssetName.indexOf('.ico')>-1){
                        contentType = 'favicon'
                    }
                    callback(200,data,contentType);
                }else{
                    callback(405);
                }
            });
        }else{
            callback(405);
        }
    }else{
        callback(405)
    }
}





























/*
*JSON API Handlers
*
*/

//Users Handler
handlers.users = (data,callback)=>{
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method)>-1){
        handlers._users[data.method](data,callback);
    }else{
        callback(405);
    }
};

//Container for the users submethods
handlers._users = {};

//Users - post
//Required data : firstName, lastName, phone, password,tosAgreement
//Optional data:none
handlers._users.post = (data,callback)=>{
//Check that all required fields are filled out
    console.log(data.payload.phone);
    console.log(typeof(data.payload.phone));
    var firstName = typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;    
    var phone = typeof(data.payload.phone)=='number' && data.payload.phone.toString().length==10 ? data.payload.phone : false;
    var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    var  tosAgreement= typeof(data.payload.tosAgreement)=='boolean' && data.payload.tosAgreement == true ? true : false;
    console.log(phone);
    if(firstName && lastName && password && tosAgreement){
        //Make sure that the users doesnt already exist
        _data.read('users',phone,(err,data)=>{
            if(err){
                //Hash the password
                var hashedPassword = helpers.hash(password);

                //Create the user object
                if(hashedPassword){
                    var userObject = {
                    "firstName":firstName,
                    "lastName":lastName,
                    "phone":phone,
                    "hashedPassword":hashedPassword,
                    "tosAgreement":true
                };

                //Store the user

                _data.create("users",phone,userObject,(err)=>{
                    if(!err){
                        callback(200);
                    }else{
                        console.log(err);
                        callback(500,{"Error":"Couldnt create the new User"});
                    }
                });
                }else{
                    callback(500,{"Error":"Couldnot hash the users password"});
                }
                
            }else{
                //User with phone number already exist
                callback(400,{"Error":"A user with that phone number already exists"});
            }
        })
        

    }else{
        callback(400,{"Error":"Missing required fields"});
    }
};

//Users - get
//Required data:phone 
//Optional data:none
//only let an authenticated user access their object
handlers._users.get = (data,callback)=>{
    //check phone is valid
    var phone = typeof(data.queryStringObject.phone)=='string' && data.queryStringObject.phone.length ==10? data.queryStringObject.phone : false;
    if(phone){
        //get the token from the headers
        var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
        //verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,phone,(validity)=>{
            if(validity){
                //lookup the user
            _data.read('users',phone,(err,data)=>{
                    if(!err && data){
                //Remove the hashed password before returning the data to the user
                         delete data.hashedPassword;
                         callback(200,data);
            }else{
                callback(403,{"ERROR":"User not found"});
            }
        });
            }else{
                callback(400,{"Error":"Wrong token id or token not given"});
            }
        });
        
    }else{
        callback(400,{"Error":"Missing required field"});
    }
};

//Users - put
//required data: phone
//optional data : firstName,lastName, password(at least one must be specified)
handlers._users.put = (data,callback)=>{
    //check for the required field
    var firstName = typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;    
    var phone = typeof(data.payload.phone)=='number' && data.payload.phone.toString().length==10 ? data.payload.phone : false;
    var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    //Error if phone is invalid
    if(phone){
        if(firstName||lastName||password){
            var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
            handlers._tokens.verifyToken(token,phone,(validity)=>{
                if(validity){
                     _data.read('users',phone,(err,data)=>{
                            if(!err && data){
                                //Update the fields necessary
                                if(firstName){
                                    data.firstName=firstName;
                                }
                                if(lastName){
                                    data.lastName=lastName;
                                }
                                if(password){
                                    data.hashedPassword=helpers.hash(password);
                                }
                            _data.update('users',phone,data,(err)=>{
                                if(!err){
                                    callback(200,{"SUCCESS":"successfully updated the field"});
                                }else{
                                    callback(500,{"Error":"Couldnt update the request"});
                                }
                            });

                            }else{
                                callback(400,{"ERROR":"User not found"});
                            }
                        });
                }else{
                    callback(400,{"Error":"Wrong token id or token not given"});
                }
            });
          
        }else{
            callback(400,{"Error":"Missing required field"});
        }
    }else{
        callback(400,{"Error":"Missing required field"});
    }

};

//Users  - delete
//Required field:phone
handlers._users.delete = (data,callback)=>{
    //check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone)=='string' && data.queryStringObject.phone.length ==10? data.queryStringObject.phone : false;
    if(phone){
        //lookup the user
        var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
            handlers._tokens.verifyToken(token,phone,(validity)=>{
                if(validity){
                     _data.read('users',phone,(err,data)=>{
                          if(!err && data){
                  //Remove the hashed password before returning the data to the user
                       _data.delete('users',phone,(err)=>{
                          if(!err){
                            //delete each of the checks associated with the user
                            var userChecks = typeof(data.checks) == "object" && data.checks instanceof Array ? data.checks :[];
                            var checksToDelete =userChecks.length;
                            if(checksToDelete>0){
                                var checksDeleted = 0;
                                var deletionErrors = false;
                                userChecks.forEach((checkId) => {
                                    _data.delete('checks',checkId,(err)=>{
                                        if(err){
                                            deletionErrors=true;
                                        }
                                        checksDeleted++;
                                        if(checksDeleted == checksToDelete){
                                            if(!deletionErrors){
                                                callback(200);
                                            }else{
                                                callback(500,{"Error":"Error encountered while attempting to delete all the checks of the user"});
                                            }
                                        }
                                    });
                                    
                                });
                            }else{
                                callback(200);
                            }
                          }else{
                          callback(500,{"Error":"Could not delete the specified user"});
                      }
                  }); 
                  }else{
                   callback(400,{"ERROR":"User not found"});
                    }
                 });
                }else{
                    callback(400,{"Error":"Wrong token id or token not given"});
            }
        });
    }else{
        callback(400,{"Error":"Missing required field"});
    }
};

//Tokens handler
handlers.tokens = (data,callback)=>{
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method)>-1){
        handlers._tokens[data.method](data,callback);
    }else{
        callback(405);
    }
};

//Container for all the tokens methods
handlers._tokens ={};

//Required data: phone,passoword
//optional data none
handlers._tokens.post =(data,callback)=>{
    var phone = typeof(data.payload.phone)=='number' && data.payload.phone.toString().length==10 ? data.payload.phone : false;
    var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    if(phone && password){
        //lookup the user who matches the phone number
        _data.read('users',phone,(err,userData)=>{
            if(!err && userData){
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    //if valid create a new token with a random name and expiration date of one year
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject ={
                        'phone':phone,
                        'id':tokenId,
                        'expires':expires
                    };
                    //Store the token
                    _data.create('tokens',tokenId,tokenObject,(err)=>{
                        if(!err){
                            callback(200,tokenObject);
                        }else{
                            callback(500,{"Error":"Could not create the token due to server error"})
                        }
                    });

                }else{
                    callback(400,{"Error":"Wrong Passoword"});
                }
            }else{
                callback(400,{"Error":"Couldnot find the user"})
                }
            });
    }else{
        callback(400,{"Error":"Missing Required Field"});
    }
}; 
//required data:id
//optional data:none
handlers._tokens.get =(data,callback)=>{
// check that the data is valid
var id = typeof(data.queryStringObject.id)=='string' && data.queryStringObject.id.length>0 ? data.queryStringObject.id : false;
if(id){
    //lookup the user
    _data.read('tokens',id,(err,data)=>{
        if(!err && data){
            callback(200,data);
        }else{
            callback(404,{"ERROR":"User not found"});
        }
    });
}else{
    callback(400,{"Error":"Missing required field"});
}

};
//required data:id,extend
//optinal data:none
handlers._tokens.put =(data,callback)=>{
    console.log(data.payload);
    var id=typeof(data.payload.id)=='string' && data.payload.id.length>0?data.payload.id:false;
    var extend=typeof(data.payload.extend)=='boolean' && data.payload.extend==true ?true:false;
    if(id && extend){
        //Lookup the token
        _data.read('tokens',id,(err,tokendata)=>{
            if(!err && tokendata){
                if(tokendata.expires>Date.now()){
                    tokendata.expires=Date.now()+1000*60*60;
                _data.update('tokens',id,tokendata,(err)=>{
                    if(!err){
                        callback(200,{"SUCCESS":"successfully updated the token"});
                    }
                    else{
                        callback(500,{"Error":"Some internal Error"});
                    }
                })
                }else{
                    callback(400,{"Error":"token has already been expired and cannot be extended"})
                }
                
            }else{
                callback(400,{"Error":"Could not find token"});
            }
        });
    }else{
        callback(400,{"Error":"Missing Required fields"});
    }
};

//required data:tokenid
handlers._tokens.delete =(data,callback)=>{
    var id=typeof(data.queryStringObject.id)=="string" && data.queryStringObject.id.length>0?data.queryStringObject.id:false;
    if(id){
        _data.read('tokens',id,(err,data)=>{
            if(!err && data){
                _data.delete('tokens',id,(err)=>{
                    if(!err){
                        callback(200,{"SUCCESS":"Successfully deleted the token"});
                    }else{
                        callback(500,{"Error":"Some internal Error"});
                    }
                });
            }else{
                callback(400,{"Error":"Couldn't read the token"});
            }
        });
    }else{
        callback(400,{"Error":"Token id is not correct"});
    }
};

//verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (tokenid,phone,callback)=>{
//lookup the token
    _data.read('tokens',tokenid,(err,tokenData)=>{
        if(!err && tokenData){
             //check that the token is for the given user and has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now() ){
                callback(true);
            }else{
                callback(false);
            }

        }else{
            callback(false);
        }
    });
};

// Ping Handler
handlers.ping = (data,callback)=>{
    callback(200);
};

//Not found Handler
handlers.notFound=(data,callback)=>{
    callback(404);    
};

 handlers.checks = (data,callback)=>{
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method)>-1){
        handlers._checks[data.method](data,callback)
    }else{
        callback(405);
    }
 };

handlers._checks={};
//required data:protocol,url,method,successCodes,timeoutSeconds
//optional data:none
handlers._checks.post=(data,callback)=>{
    //valid inputs
    var protocol=typeof(data.payload.protocol)=='string' && ['http','https'].indexOf(data.payload.protocol)>-1 ? data.payload.protocol : false;
    var url=typeof(data.payload.url)=='string' && data.payload.url.trim().length>0 ? data.payload.url.trim() : false;
    var method=typeof(data.payload.method)=='string' && ['get','post','put','delete'].indexOf(data.payload.method)>-1 ? data.payload.method : false;
    var successCodes=typeof(data.payload.successCodes)=='object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length>0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds)=="number" && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds<=5 && data.payload.timeoutSeconds %1==0?data.payload.timeoutSeconds:false;
    console.log(protocol,url,method,successCodes,timeoutSeconds);
    if(protocol && url && method && successCodes && timeoutSeconds){
        //Get the tokens from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //lookup the user by reading the token
        _data.read('tokens',token,(err,tokenData)=>{
            if(!err && tokenData){
                var userPhone = tokenData.phone;
                //lookup the user data
                _data.read('users',userPhone,(err,userData)=>{
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == "object" && userData.checks instanceof Array ? userData.checks :[];
                        //Verify that the user has less than the number of max-checks-per-user
                        if(userChecks.length < config.maxChecks){
                            //create a random id for the checks
                            var checkId = helpers.createRandomString(20);
                            //create the checks objects, and include the users phone
                            var checkObject = {
                                'protocol':protocol,
                                'id':checkId,
                                'userPhone':userPhone,
                                'url':url,
                                'method':method,
                                'successCodes':successCodes,
                                'timeoutSeconds':timeoutSeconds
                            };
                            _data.create('checks',checkId,checkObject,(err)=>{
                                if(!err){
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                
                                _data.update('users',userPhone,userData,(err)=>{
                                    if(!err){
                                        callback(200,checkObject);
                                    }else{
                                        callback(500,{"Error":"Couln't update the user with the new check"});
                                    }
                                });
                                
                                
                                }
                            })
                        }else{
                            callback(400,{"Error":"The user already has the maximum number of checks"});
                        }
                    }else{
                        callback(403);
                    }
                });
            }else{
                callback(403);
            }
        });
    }else{
        callback(400,{"Error":"Information entered are not valid"})
    }
};

//required data:id
//optinal data : none
handlers._checks.get=(data,callback)=>{
    //check phone is valid
    var id = typeof(data.queryStringObject.id)=='string' && data.queryStringObject.id.length ==20? data.queryStringObject.id : false;
    if(id){
        //lookup the check
        _data.read("checks",id,(err,checkdata)=>{
            if(!err && checkdata){
                  //get the token from the headers
                var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
                //verify that the given token is valid for the phone number and belongs to the user who created it
                handlers._tokens.verifyToken(token,checkdata.userPhone,(validity)=>{
                        if(validity){
                            //lookup the user
                            callback(200,checkdata);
                         }else{
                              callback(403);
                        }});
                        }else{
                             callback(400,{"Error":"Wrong token id or token not given"});
                        }
                    });    
    }else{
        callback(400,{"Error":"Missing required field"});
    }
};


//required data:id
//optional data:protocol,url,method,successCodes,timeoutSeconds
handlers._checks.put=(data,callback)=>{
    var id = typeof(data.payload.id)=='string' && data.payload.id.length==20 ? data.payload.id : false;
    var protocol=typeof(data.payload.protocol)=='string' && ['http','https'].indexOf(data.payload.protocol)>-1 ? data.payload.protocol : false;
    var url=typeof(data.payload.url)=='string' && data.payload.url.trim().length>0 ? data.payload.url.trim() : false;
    var method=typeof(data.payload.method)=='string' && ['get','post','put','delete'].indexOf(data.payload.method)>-1 ? data.payload.method : false;
    var successCodes=typeof(data.payload.successCodes)=='object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length>0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds)=="number" && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds<=5 && data.payload.timeoutSeconds %1==0?data.payload.timeoutSeconds:false;
    if(id){
        if(protocol || url || method || successCodes || timeoutSeconds){
            _data.read('checks',id,(err,checkdata)=>{
                if(!err && checkdata){
                    var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
                    handlers._tokens.verifyToken(token,checkdata.userPhone,(validity)=>{
                        if(validity){
                            if(protocol){
                                checkdata.protocol=protocol;
                            }
                            if(url){
                                checkdata.url=url;
                            }
                            if(method){
                                checkdata.method=method;
                            }
                            if(successCodes){
                                checkdata.successCodes=successCodes;
                            }
                            if(timeoutSeconds){
                                checkdata.timeoutSeconds=timeoutSeconds;
                            }
                            _data.update('checks',id,checkdata,(err)=>{
                                if(!err){
                                    callback(200);
                                }else{
                                    callback(500,{"Error":"Internal Error"});
                                }
                            })
                        }else{
                            callback(400,{"Error":"Token Error"});
                        }
                    });
                }else{
                    callback(400,{"Error":"Check ID did not exist"});
                }
            })
        }else{
            callback(400,{"Error":"Missing fields to update"});
        }
    }else{
        callback(400,{"Error":"Missing required fields"});
    }

};


//required data:id
//optional data:none
handlers._checks.delete=(data,callback)=>{
    var id = typeof(data.queryStringObject.id)=='string' && data.queryStringObject.id.length == 20? data.queryStringObject.id : false;
    if(id){
        //lookup the user
        _data.read('checks',id,(err,checkdata)=>{
            console.log(checkdata);
            if(!err && checkdata){
                var token = typeof(data.headers.token) == 'string' && data.headers.token.length>0?data.headers.token:false;
                handlers._tokens.verifyToken(token,checkdata.userPhone,(validity)=>{
                if(validity){
                    _data.delete('checks',id,(err)=>{
                        if(!err){
                            _data.read('users',checkdata.userPhone,(err,data)=>{
                            if(!err && data){
                            //Remove the hashed password before returning the data to the user
                                var userChecks = typeof(data.checks) == "object" && data.checks instanceof Array ? data.checks :[];
                                var checkPosition = userChecks.indexOf(id);
                                if(checkPosition >-1){
                                    userChecks.splice(checkPosition,1);
                                    _data.update('users',checkdata.userPhone,data,(err)=>{
                                   if(!err){
                                      callback(200);
                                    }else{
                                          callback(500,{"Error":"Could not delete the specified user"});
                                  }
                                });
                                }else{
                                    callback(400,{"Error":"Couldnot find the check on the users object so could not remove it"});
                                }
                                 
                                }else{
                                    callback(400,{"ERROR":"User not found and check not deleted"});
                                }
                             });
                        }else{
                            callback(500,{"Error":"couldnot delete checked data"});
                        }
                    });
                    
                }else{
                    callback(400,{"Error":"Wrong token id or token not given"});
            }
        });
            }else{
                callback(400,{"Error":"Check doesnt exist"});
            }
        });
        
    }else{
        callback(400,{"Error":"ID entered is wrong or not valid"});
    }
};


module.exports= handlers;