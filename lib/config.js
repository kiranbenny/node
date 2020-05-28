//create and export configuratiojn variable
//container for all the environments
var environments={};

//Staging (default)environment
environments.staging={
    "httpPort":3000,
    "httpsPort":3001,
    "envName":"staging",
    "hashingSecret":"thisIsASecret",
    "maxChecks":5,
    'twilio' : {
        'accountSid' : 'AC54b842f3d5f66376e5061b9859455d57',
        'authToken' : 'a4b72ebe9e669a124d5c24ab7e170c61',
        'fromPhone' : '+12563630415'
      },
      'templateGlobals':{
          'appName':'UptimeChecker',
          'companyName':'NotaRealCompany',
          'yearCreated':'2018',
          'baseUrl':'http://localhost:3000/'
      }
};

//production environment
environments.production={
    "httpPort":5000,
    "httpsPort":5001,
    "envName":"production",
    "hashingSecret":"thisIsAlsoASecret",
    "maxChecks":5,
    "twilio":{
        'accountSid':'',
        'authToken':'',
        'fromPhone':''
    },
    'templateGlobals':{
        'appName':'UptimeChecker',
        'companyName':'NotaRealCompany',
        'yearCreated':'2018',
        'baseUrl':'http://localhost:5000/'
    }
};
// console.log(process);
var currentEnvironment = typeof(process.env.NODE_ENV)=='string'?process.env.NODE_ENV.toLowerCase():'';
//check that the currentEnvironment is one of the key in environment

var environmentToExport = typeof(environments[currentEnvironment])==='object'?environments[currentEnvironment]:environments.staging;

module.exports=environmentToExport; 