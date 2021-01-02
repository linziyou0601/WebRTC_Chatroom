//---------- FILE SYSTEM ----------//
const path = require('path');
const fs = require('fs');

//---------- SERVER ----------//
const linkPreviewGenerator = require("link-preview-generator");
const https = require('https');
const express = require('express');
const app = express();
const port = 3000
const hostname = '0.0.0.0'

const server = app.listen(port, hostname, function (req, res) {
    console.log(`listening at: ${hostname}:${port}`);
});

/*var credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/dbmshw.linziyou.info/privkey.pem'),   //server-key.pem
    cert: fs.readFileSync('/etc/letsencrypt/live/dbmshw.linziyou.info/cert.pem')      //server-cert.pem
};
  
const server = https.createServer(credentials, app).listen(port, hostname, function (req, res) {
    console.log(`listening at: ${hostname}:${port}`);
});*/

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/public'));

//---------- PEER SERVER ----------//
const customGenerationFunction = () => ('R-' + randomValueHex(8));
const expressPeerServer = require('peer').ExpressPeerServer;
const peerserver = expressPeerServer(server, {debug: true, allow_discovery: true, generateClientId: customGenerationFunction});

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

//---------- CLIENT 頁面 ----------//
app.get('/client', function(req, res){
    res.render('index-client', {
        protocol: req.protocol,
        domain: req.headers.host,
        joinID: req.query.joinID || "",
        customID: req.query.customID || ""
    });
});

//---------- 取得URL的PREVIEW資料 ----------//
app.get('/get_preview', async function(req, res){
    try{
        let url = req.query.url;
        const previewData = await linkPreviewGenerator(url);
        console.log(previewData);
        res.send(previewData);
    } catch(error){
        console.log('錯誤訊息: ', error);
        res.send({"title":"","description":"","domain":"","img":""});
    }
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



