
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

console.log("here we go")

/*

var privateKey  = fs.readFileSync(__dirname+'/c6031_73bc5_df79cedd80388b3e2e675afb4134b13e.key', 'utf8');
var certificate = fs.readFileSync(__dirname+'/oasis40_com_c6031_73bc5_1721707178_96f62283d41724483f115dcb6675426c.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

const express = require('express')
const app = express()


var httpServer = http.createServer(app);
httpServer.listen(8081);



var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);




app.get('/*', function (req, res) {
  if(req.url=="/testnode/")
  {
      fs.readFile('client/index.html', function (err, html) {
         res.writeHeader(200, {"Content-Type": 'text/html'});
         res.write(html);
         res.end();
    });
  }
  else if(req.url=="/testnode/webrtc.js")
  {
      //res.sendFile('webrtc.js');
      fs.readFile('client/webrtc.js', function (err, html) {
         res.writeHead(200, {'Content-Type': 'application/javascript'});
         res.write(html);
         res.end();
    });
  }
})

*/


const serverConfig = {
   key: fs.readFileSync(__dirname+'/c6031_73bc5_df79cedd80388b3e2e675afb4134b13e.key'),
   cert: fs.readFileSync(__dirname+'/oasis40_com_c6031_73bc5_1721707178_96f62283d41724483f115dcb6675426c.crt'),
};


const handleRequest = function(request, response) {
  // Render the single client html file for any request the HTTP server receives
    response.writeHead(200, {'Content-Type': 'text/plain'});
    var message = 'It works!\n',
        version = request.url,
        res = [message, version].join('\n');
    response.end(res);
   
    
    

   
};
let handleHttp = (request, response)=>{
   console.log("run")
   console.log(request.url)
   if(request.url === '/testnode/' || request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(fs.readFileSync(__dirname+'/client/index.html'));
  } else if(request.url === '/testnode/webrtc.js' || request.url === '/webrtc.js') {
      response.writeHead(200, {'Content-Type': 'application/javascript'});
      response.end(fs.readFileSync(__dirname+'/client/webrtc.js'));
  }
  else
   {
	response.writeHead(200, {'Content-Type': 'text/plain'});
    	var message = 'It works!\n',
        version = request.url,
        res = [message, version].join('\n');
    	response.end(res);
    }	
}

/*
var httpServer = http.createServer(handleHttp);
httpServer.listen(8081);
*/

const httpsServer = https.createServer(serverConfig, handleHttp);
httpsServer.listen(8443);


var users = {};
var allUsers = [];



// Create a server for handling websocket calls
const wss = new WebSocketServer({server: httpsServer});

const generateId = () =>
{
  return Math.floor(Date.now() / 10)
}

wss.on('connection', function(ws) {
   ws.on('error', (err)=>{
      console.log(err+"buerr")
      resetLeavedOnes()
   });
   ws.on('message', function(message) {

      var data;
		
    //accepting only JSON messages 
      try { 
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      }
    
      console.log('received data:', data);
     //switching type of the user message 
      switch (data.type) { 
      //when a user tries to login 
         case "login": 
            console.log("User logged", data.name); 
     
            console.log('if anyone is logged in with this username then refuse'); 
            if(users[data.name]) { 
               sendTo(ws, { 
                  type: "login", 
                  success: false 
               }); 
            } 
            else { 
               console.log('save user connection on the server')                
               //console.log(ws.name)
               //ws.unique_id = generateId
               users[data.name] = ws; 
               allUsers.indexOf(data.name) === -1 ? allUsers.push(data.name) : console.log("This item already exists");
               
               //console.log('all available users',JSON.stringify(users))
               ws.name = data.name;
       
               sendTo(ws, { 
                  type: "login", 
                  success: true, 
                  allUsers:allUsers
               }); 

               if(allUsers.length)
               {
                  console.log("send all")
                  console.log(allUsers)
                  for(let user of allUsers)
                  {
                     let the_user = users[user]
                     sendTo(the_user, { 
                        type: "newusers", 
                        allUsers:allUsers
                     }); 
                  }
               }
               
            } 
     
         break;
     
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name); 
     
            //if UserB exists then send him offer details 
            var conn = users[data.name]; 
     
            if(conn != null) { 
               //setting that UserA connected with UserB 
               ws.otherName = data.name; 
       
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: ws.name 
               }); 
            } 
     
         break;
     
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 
            console.log('answer: ',data.answer)
      
            if(conn != null) { 
               ws.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               });
            } 
      
         break;
         case "rejectoffer": 
            console.log("Sending rejectoffer to: ", data); 
            
      
         break;
     
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
            var conn = users[data.name];  
      
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate,
                  name:ws.name
               }); 
            } 
      
         break;
     
         case "leave": 
            console.log("Disconnecting from", data.name); 
            var conn = users[data.name]; 
            
      
            //notify the other user so he can disconnect his peer connection 
            if(conn != null) { 
               conn.otherName = null; 
               sendTo(conn, { 
                  type: "guestleft" 
               }); 
            }  
      
         break;
     
         default: 
            sendTo(ws, { 
               type: "error", 
               message: "Command not found: " + data.type 
            });
      
         break; 
      }  
    //wss.broadcast(message);
   });

   ws.on("close", function() { 
      console.log("close")
      if(ws.name) { 

         delete users[ws.name]; 
    
         if(ws.otherName) { 
            console.log("Disconnecting from ", ws.otherName); 
            var conn = users[ws.otherName]; 
            conn.otherName = null;  
         
            if(conn != null) { 
               sendTo(conn, { 
                  type: "guestleft" 
               }); 
            }  
         } 
      } 
   });  

   //ws.send("Hello world"); 
});
wss.on("close", () =>{
   console.log("close")
   wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
})

function sendTo(connection, message) { 
  connection.send(JSON.stringify(message)); 
}

function resetLeavedOnes()
{
   console.log("resetLeavedOnes")
   wss.clients.forEach(function each(ws) {
      //console.log(ws)
      console.log(ws.OPEN)
      console.log(ws.CLOSED)
      console.log(allUsers)
      console.log(ws.name)
      if(ws.OPEN!==1)
      {
         if (ws.isAlive === false) return ws.terminate();

         ws.isAlive = false;
         ws.ping();
      }
      allUsers = allUsers.filter(item=>item !==ws.name)
    
  });
}





