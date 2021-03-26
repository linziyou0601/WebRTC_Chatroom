//---------- FILE SYSTEM ----------//
const bodyParser = require('body-parser')
const path = require('path');
const fs = require('fs');
const getLinkPreview = require('link-preview-js').getLinkPreview;

//---------- SERVER ----------//
const https = require('https');
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const hostname = '0.0.0.0'

const server = app.listen(port, hostname, function (req, res) {
    console.log(`listening at: ${hostname}:${port}`);
});

/*var credentials = {
    key: fs.readFileSync('/var/www/WebRTC_Chatroom/ssl/privkey.pem'),   //server-key.pem
    cert: fs.readFileSync('/var/www/WebRTC_Chatroom/ssl/cert.pem')      //server-cert.pem
};
  
const server = https.createServer(credentials, app).listen(port, hostname, function (req, res) {
    console.log(`listening at: ${hostname}:${port}`);
});*/

//---------- PEER SERVER ----------//
const customGenerationFunction = () => ('R-' + randomValueHex(8));
const expressPeerServer = require('peer').ExpressPeerServer;
const peerserver = expressPeerServer(server, {
                                     debug: true, 
                                     allow_discovery: true,
                                     generateClientId: customGenerationFunction,
                                     config: {'iceServers': [
                                         { url: 'stun:stun.l.google.com:19302' },
                                         { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
                                     ]}
                                    });

//---------- PEER CLIENT OBJECT ----------//
var clientDict = {}
var roomDict = {}
var roomMemberDict = {}

//---------- PEER API ENDPOINT ----------//
app.use('/api', peerserver);

//---------- PEER SERVER 連線處理 ----------//
peerserver.on('connection', (client) => {
    console.log(`${client.id}已連接至伺服器`);
})
peerserver.on('disconnect', (client) => {
    console.log(`${client.id}與伺服器連接中斷`);
});



//---------- EJS ----------//
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/public'));

//---------- CLIENT 頁面 ----------//
app.get('/client', function(req, res){
    res.render('index-client', {
        protocol: (req.headers.host.includes('heroku'))? "https": req.protocol,
        domain: req.headers.host,
        hostname: req.hostname,
        secure: (req.protocol=="https" || req.headers.host.includes('heroku'))? true: false,
        joinID: req.query.joinID || "",
        customID: req.query.customID || "",
        needPort: !req.headers.host.includes('heroku')
    });
});

//---------- 取得URL的PREVIEW資料 ----------//
app.get('/get_preview', async function(req, res){
    let url = req.query.url;
    getLinkPreview(url, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
            "Accept-Language": "zh-TW",
        }
    })
    .then(data => {
        console.log(data)
        let title = "";
        let description = "";
        let link = data.url;
        let image = data.favicons[data.favicons.length-1] || null;
        switch(true) {
            case data.contentType.includes("text/html"):
                title = data.title;
                description = data.description;
                image = data.images[0] || image;
                break;
            case data.contentType.includes("image"):
                image = data.url;
                break;
            case data.contentType.includes("audio"):
                image = image || "/image/audio.png";
                break;
            case data.contentType.includes("video"):
                image = image || "/image/video.png";
                break;
            case data.contentType.includes("application"):
                image = image || "/image/application.png";
                break;
        }
        res.send({"title":title,"description":description,"link":link,"image":image});
    })
    .catch(catchErr => {
        console.log('錯誤訊息: ', catchErr);
        res.send({"title":"","description":"","link":"","image":null});
    });
});

//---------- 取得ROOM的隨機字串 ----------//
app.get('/get_room_nonce', function(req, res){
    let uid = 'ROOM-' + randomValueHex(6);
    res.send(uid);
});

//---------- 產生隨機字串 ----------//
function randomValueHex(len) {
    return require("crypto").randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len).toUpperCase();   // return required number of characters
}