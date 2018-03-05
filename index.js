var linebot = require('linebot');
var express = require('express');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var bot = linebot({
  channelId: '1565775353',
  channelSecret: '7b163daafb07d9f5fc3acc2c300cb385',
  channelAccessToken: 'A6uCzJfmVHYV5M2U7xjvqL11mf+OyXnVdpKnw9RQJrcjHJ060wWXc2Dc5foGSj+I9r6RJ94rffT4Fkbm7PZ7IO7aIrGFzMtmMF0qE1rzPVaKKGn8jF4dftN0+9tYX9F8zaodvsKAw64vWd9oTqvAYQdB04t89/1O/w1cDnyilFU='
});
//
//底下輸入client_secret.json檔案的內容
var myClientSecret={"installed":{"client_id":"952684823306-7uhk81d52ihpgp1pjq9abr3p6au2t1ck.apps.googleusercontent.com","project_id":"asymmetric-lore-196801","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://accounts.google.com/o/oauth2/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"jPQD4vp7-iNZbomweGX4uqQU","redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]}}

var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(myClientSecret.installed.client_id,myClientSecret.installed.client_secret, myClientSecret.installed.redirect_uris[0]);

//底下輸入sheetsapi.json檔案的內容
oauth2Client.credentials ={"access_token":"ya29.GltyBa_7ZE2_041JmoLyQKSNWnSlO_wtL0vISlOso1Ynac_CwHnhIZdoPBxs2FRqSgBOef7JcR9P5cL9Ja9wkhLTdvswFfZ1o7fLiPDw_HzQEsTyKijOie9kp8nS","refresh_token":"1/5hnNwwlHT7NemNKaWGcXG2KYyQxXQnx6vF6uxBpciKDteWccYJ815N5WSyXTy8x4","token_type":"Bearer","expiry_date":1519969615582}

//試算表的ID，引號不能刪掉
var mySheetId='1X0ATHLqpOqmGxQMqkvCLh6zvLNVnezxT0rMsgoDjU28';

var myQuestions=[];
var users=[];
var totalSteps=0;
var myReplies=[];

//程式啟動後會去讀取試算表內的問題
getQuestions();


//這是讀取問題的函式
function getQuestions() {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
     auth: oauth2Client,
     spreadsheetId: mySheetId,
     range:encodeURI('問題'),
  }, function(err, response) {
     if (err) {
        console.log('讀取問題檔的API產生問題：' + err);
        return;
     }
     var rows = response.values;
     if (rows.length == 0) {
        console.log('No data found.');
     } else {
       myQuestions=rows;
       totalSteps=myQuestions[0].length;
       console.log('要問的問題已下載完畢！');
     }
  });
}

//這是將取得的資料儲存進試算表的函式
function appendMyRow(userId) {
   var sheets = google.sheets('v4');
   var request = {
      auth: oauth2Client,
      spreadsheetId: mySheetId,
      range:encodeURI('Form responses 1'),
      insertDataOption: 'INSERT_ROWS',
      //valueInputOption: "USER_ENTERED",
      valueInputOption: 'RAW',
      resource: {
        "values": [
          users[userId].replies
        ]
      }
   };
   sheets.spreadsheets.values.append(request, function(err, response) {
      if (err) {
         console.log('The API returned an error: ' + err);
         return;
      }else {
         console.log("Appended");
      }
   });
}

//LineBot收到user的文字訊息時的處理函式
bot.on('message', function(event) {
   if (event.message.type === 'text') {
      var myId=event.source.userId;
      if (users[myId]==undefined){
         users[myId]=[];
         users[myId].userId=myId;
         users[myId].step=-1;
         users[myId].replies=[];
      }
      var myStep=users[myId].step;
      if (myStep===-1)
         sendMessage(event,myQuestions[0][0]);
      else{
         if (myStep==(totalSteps-1))
            sendMessage(event,myQuestions[1][myStep]);
         else
            sendMessage(event,myQuestions[1][myStep]+'\n'+myQuestions[0][myStep+1]);
         users[myId].replies[myStep+1]=event.message.text;
      }
      myStep++;
      users[myId].step=myStep;
      if (myStep>=totalSteps){
         myStep=-1;
         users[myId].step=myStep;
         users[myId].replies[0]=new Date();
         appendMyRow(myId);
      }
   }
});


//這是發送訊息給user的函式
function sendMessage(eve,msg){
   eve.reply(msg).then(function(data) {
      // success 
      return true;
   }).catch(function(error) {
      // error 
      return false;
   });
}


const app = express();
const linebotParser = bot.parser();
app.post('/', linebotParser);

//因為 express 預設走 port 3000，而 heroku 上預設卻不是，要透過下列程式轉換
var server = app.listen(process.env.PORT || 8080, function() {
  var port = server.address().port;
  console.log("App now running on port", port);
});


/*
//這一段的程式是專門處理當有人傳送文字訊息給LineBot時，我們的處理回應
bot.on('message', function(event) {
  if (event.message.type = 'text') {
    var msg = event.message.text;
      //收到文字訊息時，直接把收到的訊息傳回去
      event.reply(event.source.userId).then(function(data) {
        // 傳送訊息成功時，可在此寫程式碼 
        console.log(msg);
      }).catch(function(error) {
        // 傳送訊息失敗時，可在此寫程式碼 
        console.log('錯誤產生，錯誤碼：'+error);
      });
    }
});

const app = express();
const linebotParser = bot.parser();
app.post('/', linebotParser);

var server = app.listen(process.env.PORT || 8080, function() {
  var port = server.address().port;
  console.log('目前的port是', port);
});
*/