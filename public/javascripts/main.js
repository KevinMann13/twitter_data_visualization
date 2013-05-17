var socket;

socket = io.connect("http://localhost:3000");

//socket.emit('readyForTweets', {});
socket.on('newTweet', function (data){
    var json = jQuery.parseJSON(data);
    if( json.text != undefined ) $('#tweets').prepend("<p>" + json.text + "</p>");
})