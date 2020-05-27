/*Library for storing and rotating logs
*/
//Dependencies

var fs = require("fs");
var path = require("path");
var zlib = require("zlib");

//container for the module 
var lib = {};
lib.baseDir = path.join(__dirname,'/../.logs/');
//Append a string to a file.Create a file if not exist.

lib.append = (file,str,callback)=>{
    //open the file for appending
    fs.open(lib.baseDir+file+'.log','a',(err,fileDescriptor)=>{
        if(!err && fileDescriptor){
            //Append to the file and close it
            fs.appendFile(fileDescriptor,str+'\n',(err)=>{
                if(!err){
                    fs.close(fileDescriptor,(err)=>{
                        if(!err){
                            callback(false);
                        }else{
                            callback("Error appending to File");
                        }
                    })
                }else{
                    callback("error appending the file")
                }
            })
        }else{
            callback("Could not open the file for appending");
        }
    });
};

//list all the logs and optionally include the compressed logs
lib.list = (includeCompressedLogs,callback)=>{
    fs.readdir(lib.baseDir,(err,data)=>{
        if(!err && data && data.length>0){
            var trimmedFileNames = [];
            data.forEach((fileName)=>{
                if(fileName.indexOf('.log')>-1){
                    trimmedFileNames.push(fileName.replace('.log','')); 
                }

            //Add on the .gz files 
            if(fileName.indexOf('.gz.b64')>-1 && includeCompressedLogs){
                trimmedFileNames.push(fileName.replace('.gz.b64'),'');
            }    
            });
            callback(false,trimmedFileNames);
        }else{
            callback(err,data);
        }
    });
};   

lib.compress = (logId,newFileId,callback)=>{
    var sourceFile = logId+'.log';
    var destFile = newFileId+'.gz.b64';

    fs.readFile(lib.baseDir+sourceFile,'utf8',(err,inputString)=>{
        if(!err && inputString){
            //Compress the data using gzip
            zlib.gzip(inputString,(err,buffer)=>{
                if(!err && buffer){
                    //Send the data to the dest file
                    fs.open(lib.baseDir+destFile,'wx',(err,fileDescriptor)=>{
                        if(!err && fileDescriptor){
                            //Write to the dest file
                            fs.writeFile(fileDescriptor,buffer.toString('base64'),(err)=>{
                                if(!err){
                                    fs.close(fileDescriptor,(err)=>{
                                        if(!err){
                                            callback(false);
                                        }else{
                                            callback(err);
                                        }
                                    })   
                                }else{
                                    callback(err);
                                }
                            });
                        }else{
                            callback(err);
                        }
                    });

                }else{
                    callback(err);
                }
            })
        }else{
            callback(err);
        }
    })
};

//Decompress the contents of a gz.b64 file into a string var
lib.decompress = (fileId,callback)=>{
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir+fileName,'utf8',(err,string)=>{
        if(!err && string){
            //decompress the data
            var inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer,(err,outputBuffer)=>{
                if(!err && outputBuffer){
                    var str = outputBuffer.toString();
                    callback(false,str)
                }else{
                    callback(err);
                }
            })
        }else{
            callback(err);
        }
    })
}

//Truncate a log file

lib.truncate = (logId,callback)=>{
    fs.truncate(lib.baseDir+logId+'.log',0,(err)=>{
        if(!err){
            callback(false);
        }else{
            callback(err)
        }
    });
};

module.exports = lib;