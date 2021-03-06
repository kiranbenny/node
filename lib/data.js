//Library for storing and editing data

var fs= require('fs');
var path = require('path');
var helpers = require('./helpers');
// container for the module to be exported

var lib={};

//base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');
//write data to a file

lib.create = (dir,file,data,callback)=>{
    // open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json','wx',(err,fileDescriptor)=>{
        if(!err && fileDescriptor){
            //convert data to a string
            var stringData = JSON.stringify(data);
            //write to file and close it
            fs.writeFile(fileDescriptor,stringData,(err)=>{
                if(!err){
                    fs.close(fileDescriptor,(err)=>{
                        if(!err){
                            callback(false);
                        }else{
                            callback("Error closing new file");
                        }
                    })
                }else{
                    callback("Error writing to new file");
                }
            });
        }
        else{
            callback('Could not create new file, it may already exist');
        }
    });
};

lib.read = (dir,file,callback)=>{
    fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf-8',(err,data)=>{
        if(!err && data){
            var parsedData = helpers.parseJsonToObject(data);
            callback(false,parsedData);
        }else{
        callback(err,data);
        }
    });
};

//Update data inside a file
lib.update = (dir,file,data,callback)=>{
    //open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json','r+',(err,fileDescriptor)=>{
         if(!err && fileDescriptor){
            var stringData = JSON.stringify(data);
            //Truncate the file
            fs.ftruncate(fileDescriptor,(err)=>{
                if(!err){
                        fs.writeFile(fileDescriptor,stringData,(err)=>{
                            if(!err){
                                fs.close(fileDescriptor,(err)=>{
                                    if(!err){
                                        callback(false);
                                    }else{
                                        callback("Error closing the file");
                                    }
                                })
                            }else{
                                callback("Error writing to existing file")
                            }
                        });
                    }else{
                    callback("Error truncating file");
                }
            });
         }else{
             callback("Could not open the file for updating,it may not exist yet");
         }
    });
};

//Delete a file
lib.delete =(dir,file,callback)=>{
    //unlink
    fs.unlink(lib.baseDir+dir+'/'+file+'.json',(err)=>{
        if(!err){
            callback(false);
        }else{
            callback("Error deleting the file");
        }
    });
};

lib.list =(dir,callback)=>{
    fs.readdir(lib.baseDir+dir+'/',(err,data)=>{
        if(!err &&data &&data.length >0){
            var trimmedFileNames = [];
            data.forEach((fileName)=>{
                trimmedFileNames.push(fileName.replace('.json',''));
            });
            callback(false,trimmedFileNames);
        }
        else{
            callback(err,data);
        }
    });
}




//Export the module
module.exports = lib;