// importing the required modules
// 1.http - To create the http server and handle the reqeusts and return the responses
// 2.url - To  parse the url mentioned in the uri
//  3.string_decoder - To decode the data sent across the intenet to the server as payload
// 4.fs -(file system) -To read and write files both synchronously and assynchronously
// 5.https - To create https server
var http=require('http');
var https=require('https');
var url=require('url');
var stringDecoder=require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var cluster=require('cluster');
var os=require('os');
// Instantiating the http server and server is listening on port 3000:)

var httpServer = http.createServer(function(req,res){
    unifiedServer(req,res);
  });

  // Instantiate the HTTPS server
  var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
  };
  var httpsServer = https.createServer(httpsServerOptions,function(req,res){
    unifiedServer(req,res);
  });
  

var unifiedServer=function(request,response){
        //Parses the url i.e( gets the url) ,true for getting the query string also (http://localhost:3000?query='hello') 
   
        var parsedUrl=url.parse(request.url,true);

        //Getting the path or route entered in the url
        var path=parsedUrl.pathname;
        var trimmedPath=path.replace(/^\/+|\/+$/g, '');
    
         // Get the query string as an object
        var queryStringObject = parsedUrl.query;

        // Get the HTTP method
        var method = request.method.toLowerCase();

        //Get the headers as an object
        var headers = request.headers;     
        
        //Getting the payload if any sent by the post method
        var decoder=new stringDecoder('utf-8');
      
        var buffer='';
        //As long as  there is a request to the server append the data sent to the buffer
        //When receiving a POST or PUT request, the request body might be important to our application. Getting at the body data is a little more involved than accessing request headers. The request object that's passed in to a handler implements the ReadableStream interface. 
        // We can grab the data right out of the stream by listening to the stream's 'data' and 'end' events.
        //    The chunk emitted in each 'data' event is a Buffer. If you know it's going to be string data, the best thing to do is collect the data in an array, then at the 'end', concatenate and stringify it.
        
        
        request.on('data',(data)=>{
            //write()	Returns the specified buffer as a string   
            buffer+=decoder.write(data);
        });
        
        request.on('end',()=>{
        //end()	Returns what remains of the input stored in the internal buffer
           buffer+=decoder.end();
          
        //Check the router for matching handel.If one is not found, use the notFound handler instead.
        var choosenHandler= (typeof(router[trimmedPath])!='undefined') ? router[trimmedPath] : handlers.notFound;
        
                   
        var data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' :buffer
        };
        
        choosenHandler(data,function(statusCode,payload){
                        //Logic for checking whether a number is sent as statusCode,if not set it to 200 
                        statusCode= typeof(statusCode) =='number' ? statusCode : 200                   
                       
                        response.setHeader('Content-Type','application/json');
                        response.writeHead(statusCode);
                      
                       if(typeof(payload)==='object'){
                       //Display object which contains message to be displayed and also queryObjects if present
                     
                          var display={
                                 messages:payload.messages,
                                 queryObject:payload.queryStringObject,
                                 data:payload.payload
                             }                     
                         
                          response.end(JSON.stringify(display));
                        }
                       else
                         response.end("Invalid route :( ");                       


                    });

    });
};


// Define all the handlers
var handlers={};

//hello handler
handlers.hello=function(data,callback){
    var message={
        'welcome':'Hello Guys Welcome',
        'question':'FAQS'
    }
    data.messages=message;
    callback(200,data);
}


// Not found handler
handlers.notFound=function(data,callback){
    callback(400,"Invalid Route");
}

// Define the request router
var router={
    'hello':handlers.hello  
    
};

var init=function(){
    if(cluster.isMaster){
        for(var i = 0; i < os.cpus().length; i++){
            cluster.fork();
        }
    }
    else
    {
            //start the http server
        httpServer.listen(config.httpPort,function(){
            console.log('The HTTP server is running on port '+config.httpPort);
        });
        

        // Start the HTTPS server
        httpsServer.listen(config.httpsPort,function(){
                console.log('The HTTPS server is running on port '+config.httpsPort);
        });

 
    }
}

init();