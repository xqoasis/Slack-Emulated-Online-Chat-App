window.addEventListener("load", router);
window.addEventListener("popstate", (newState) => {console.log(newState); router(push_history=false)});

// Constants to easily refer to pages
const LOGIN = document.querySelector(".login-page");
const CHANNEL_WHOLE = document.querySelector(".channel-whole-page");
const CHANNEL = document.querySelector(".channel-page");
const THREAD = document.querySelector(".thread-page");
const PROFILE = document.querySelector(".profile-page");
const EMOJI_LIST = ['✅', '👀', '👍', '❤️'];

const LOCALSTORAGE = window.localStorage;

var channels_interval;
var messages_interval;
var replies_interval

// Custom validation on the password reset fields
const repeatPassword = LOGIN.querySelector("#new-user input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = LOGIN.querySelector("#new-user input[name=password").value;
  const r = repeatPassword.value;
  return p == r;
}
repeatPassword.addEventListener("input", (event) => {
  if (repeatPasswordMatches()) {
    repeatPassword.setCustomValidity("");
  } else {
    repeatPassword.setCustomValidity("Password doesn't match");
  }
});



// ------------------------------------ROUTER and Page: /------------------------------------
// router: Determine which page to load by url we user manually launches a page

async function credential_router(push_history = true, paths){
  try{
    console.log("credential checked router")
    console.log("push_history is" + push_history)
    if (paths[1] === "channels" && Number.isInteger(Number(paths[2])) && Number(paths[2]) > 0){
      if (Number.isInteger(Number(paths[3])) && Number(paths[3]) > 0){
        await loadThreadPage(push_history, paths[2], paths[3]);
      }else{
        await loadOneChannelPage(push_history, paths[2]);
      }
    }else if (paths[1] === "profile"){
      await loadProfile(push_history);
    }else{
      await loadChannelsPage(push_history); 
    }
  }catch(err){
    console.log(err);
  }
}

// *************** home page
// Check if valid user
// Either redirect to loadAuthPage (invalid user) or loadChannelsPage (valid user)
async function router(push_history = true){
  try{
    console.log("router")
    let pathname = window.location.pathname
    let paths = pathname.split("/");

    if (getApiKey() != null && getUsername() != null && getUserId()!= null){
      const response = await fetch("/api/check_credential", {
        method: 'GET',
        headers: {'Content-type': 'application/json; charset=UTF-8',
                  'api_key': getApiKey(),
                  'user_id': getUserId()}
      });
      const data = await response.json();
      if (data["credential"]){
        await credential_router(push_history, paths)
      }else{
        console.log("credential doesn't match");
        await loadLogin(push_history);   
      }
    }else{
      //no credential
      history.pushState({}, null, pathname);
      LOCALSTORAGE.clear();
      if (paths[1] != 'login'){
        LOCALSTORAGE.setItem("previous URL", pathname);
      }
      console.log("no credential. log in first, then go back to " + pathname);
      await loadLogin(push_history);
    }  
  }catch(err){
    console.log(err);
  }
}


// ------------------------------------Page: /login------------------------------------

async function loadLogin(push_history = true){
  try {
    if (push_history){
      history.pushState({"page": "login"}, null, '/login');
    }
    LOGIN.style.display = "block";
    PROFILE.style.display = "none";
    CHANNEL_WHOLE.style.display = "none";
    CHANNEL.style.display = "none";
    THREAD.style.display = "none";
  
    // document.querySelector('.login .failed').style.display = "none"
  
    let login_button = LOGIN.querySelector('#old-user button');
    login_button.addEventListener('click', async function(push_history){
      await login(push_history);
    });
  
    let signup_page_button = LOGIN.querySelector('#login-signup');
    signup_page_button.addEventListener('click', function(){
      LOGIN.querySelector('#old-user').style.display = "none";
      LOGIN.querySelector('#new-user').style.display = "block";
    });
  
    let signup_button = LOGIN.querySelector('#new-user button');
    signup_button.addEventListener('click', async function(push_history){
      await signup(push_history);
    });

    let login_page_button = LOGIN.querySelector('#signup-login');
    login_page_button.addEventListener('click', async function(push_history){
      LOGIN.querySelector('#old-user').style.display = "block";
      LOGIN.querySelector('#new-user').style.display = "none";
    });
  }catch(err){
    console.log(err);
  }

}

async function login(push_history){
  // /api/login
  try{
    let username = document.querySelector(".login-page #old-user input[name=username]").value;
    let password = document.querySelector(".login-page #old-user input[name=password]").value;

    if (isEmpty(password) || isEmpty(username)){
        alert("Can not input empty");
        return false;
    }
    const response = await fetch('/api/login', {
      method: 'GET',
      headers: {'Content-type': 'application/json; charset=UTF-8',
                'username': username,
                'password': password}
    })
    const data = await response.json();
    console.log(data);
    if (data['success']){
      let api_key = data['api_key'];
      let user_id = data['user_id'];
      LOCALSTORAGE.setItem('user_id', user_id);
      LOCALSTORAGE.setItem('username', username);
      LOCALSTORAGE.setItem('xqoasis_belay_auth_key', api_key);
      // If there is no last page in the history, return loadHome, 
      // else, back to last page before login
      if (localStorage.getItem("previous URL")){
        let previous_url = LOCALSTORAGE.getItem("previous URL");
        LOCALSTORAGE.removeItem("previous URL");
        location.href = previous_url;
      }else{
        console.log('there is no previous link')
        await loadChannelsPage(push_history);
      }
    }else{
      console.log("username and password don't match");
      alert("Your username and password don't match, please try again or sign up");
      return false
    }
  }catch(err){
    console.log(err);
  }

}

async function signup(push_history = true){
  // /api/signin
  try{
    console.log("sign up")
    let username = document.querySelector(".login-page #new-user input[name=username").value;
    let password = document.querySelector(".login-page #new-user input[name=password").value;
    let repeat_password = document.querySelector(".login-page #new-user input[name=repeatPassword").value;
    if (repeat_password != password){
      alert('Password and repeated password must match!');
      return false;
    }
    if (isEmpty(password) || isEmpty(username)){
      alert("Can not input empty");
      return false;
    }
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {'Content-type': 'application/json; charset=UTF-8',
                'username': username,
                'password': password}
    });
    const data = await response.json();
    if (data['success']){
      let user_id = data['user_id'];
      let username = data['username'];
      let api_key = data['api_key'];
      LOCALSTORAGE.setItem("user_id", user_id);
      LOCALSTORAGE.setItem("username", username);
      LOCALSTORAGE.setItem("xqoasis_belay_auth_key", api_key);

      console.log("success create a new user")
      if (localStorage.getItem("previous URL")){
        let previous_url = LOCALSTORAGE.getItem("previous URL");
        LOCALSTORAGE.removeItem("previous URL");
        location.href = previous_url;
      }else{
        console.log('there is no previous link')
        await loadChannelsPage(push_history);
      }
    }else if(data['err']){
      console.log("error, username or password is invalid")
    }else{
      console.log("error, create account failed")
    }
  }catch(err){
    console.log(err);
  }
}


// ------------------------------------Page: /channels------------------------------------
// Load channel list page
// Page functions: create channel, display existed channels with number of unread messages
// Redict to loadSingleChannel by creating a channel or clicking an existed channel href
async function loadChannelsPage(push_history = true){
  try{
    if (push_history){
      history.pushState({"page": "channel-whole-page"}, null, '/channels');
    }
    LOGIN.style.display = "none";
    CHANNEL_WHOLE.style.display = "block";
    PROFILE.style.display = "none";
  
    CHANNEL_WHOLE.querySelector(".sidebar-welcome p").innerHTML = getUsername();
  
    // add create button
    CHANNEL_WHOLE.querySelector("#sidebar-create-btn").addEventListener('click', function(){
      CHANNEL_WHOLE.querySelector("#sidebar-create-btn").style.display = "none";
      CHANNEL_WHOLE.querySelector("#sidebar-create-channel").style.display = "block";
      let new_channel_close = CHANNEL_WHOLE.querySelector(".sidebar-create-channel-container #close");
      new_channel_close.addEventListener('click', function(){    
        CHANNEL_WHOLE.querySelector("#sidebar-create-btn").style.display = "block";
        CHANNEL_WHOLE.querySelector("#sidebar-create-channel").style.display = "none";
      });
      let new_channel_create = CHANNEL_WHOLE.querySelector(".sidebar-create-channel-container #create");
      new_channel_create.addEventListener('click', async function(push_history){
        await createChannel(push_history);
      });
    });
    await startChannelPolling();
    channels_interval = setInterval(startChannelPolling, 1000)
    // await startChannelPolling();
  }catch(err){
    console.log(err);
  }
}

async function showOneChannel(channel){
  try{
    let channel_container = document.createElement('channel');
    
    channel_container.setAttribute('id', 'channel_' + channel['channel_id']);
    let channel_link = document.createElement('a');
    channel_link.setAttribute("class", "sidebar-channel");
    channel_link.href = "/channels/" + channel['channel_id'];
    channel_link.innerHTML = "# " + channel['channel_name'];
    let channel_unread_num = document.createElement('p');
    channel_unread_num.setAttribute("class", "sidebar-channel-unread-count");

    if (Number(channel['channel_unread_message_counts']) > 0){
      channel_unread_num.innerHTML = channel['channel_unread_message_counts']
      channel_unread_num.style.color = '#ff6640';
      channel_unread_num.style.fontWeight = 'bold';
    }
    
    //
    channel_container.appendChild(channel_link);
    channel_container.appendChild(channel_unread_num);
    return channel_container;
  }catch(err){
    console.log(err);
  }

}
async function showAllChannels(all_channels){
  try{
    console.log('show all channels')
    let channels_container = CHANNEL_WHOLE.querySelector(".sidebar-channel-container");
    if (all_channels.length === document.getElementsByTagName("channel").length){
      return;
    }
    channels_container.innerHTML = "";
    all_channels.forEach(async(element) => {
      channels_container.append(await showOneChannel(element));
    });
  }catch(err){
    console.log(err);
  }

}

async function startChannelPolling(){
  // api/get_channel (GET)
  try{
    console.log('get all channels')
    let pathname = window.location.pathname;
    let paths = pathname.split("/");
    if (paths[1] !== "channels" ){
      return;
    }
    let channel_id = paths[2];
    const response = await fetch("/api/get_channels", {
      method: 'GET',
      headers: {'Content-type': 'application/json; charset=UTF-8',
                'api_key': getApiKey(),
                'user_id': getUserId()}
    });
    const data = await response.json();
    if (data["success"] == false){
        // document.querySelector(".noRooms").style.display = "block";
    }else{
      await showAllChannels(data)
    }
  }catch(err){
    console.log(err);
  }
}

async function createChannel(push_history){
  try{
    let new_channel_name = CHANNEL_WHOLE.querySelector(".sidebar-create-channel-container input").value;
    // api/create_channel (POST)
    const response = await fetch("/api/create_channel", {
      method: 'POST',
      headers: {'Content-type': 'application/json; charset=UTF-8',
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'new_channel_name': new_channel_name}
    });
    const data = await response.json();
    if (data['success']){
      let channel_id = data['channel_id'];
      let channel_name = data['channel_name'];
      console.log("create channel success:" + channel_id + "-" + channel_name);
      location.href = "/channels/" + String(channel_id);
    }else if(data['err']){
      console.log(data['err'])
    }else{
      console.log("error, create channel failed")
    }
  }catch(err){
    console.log(err);
  }

}


// ------------------------------------Page: /channels/<int:channel_id>------------------------------------
// checks if valid user/valid channel id if attempts to manually log in a channel page
// then load channel page
async function changeChannelName(channel_id, channel_name) {
  try{
    var new_channel_name = prompt("Please input the new channel name: ", channel_name);
    if (new_channel_name == null || new_channel_name == "") {
      alert('New channel name cannot be empty');
      return;
    };
    if (new_channel_name == channel_name){
      alert('New channel name repeat with old name!');
      return;   
    }
    const response = await fetch("/api/update_channel_name", {
      method: "POST",
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'channel_id': channel_id,
                'new_channel_name': new_channel_name}
    })
    const data = await response.json();
    if (data['success']){
      alert('Change channel name success!');
      location.href = '/channels/' + String(channel_id);
    }else{
      console.log('err:' + data['err']);
    }
  }catch(err){
    console.log(err);
  }

}

async function changeChannelDisplay(channel_id){
  try{
    CHANNEL_WHOLE.querySelector('#channel_' + String(channel_id)).style.background = '#2e629e';
    CHANNEL_WHOLE.querySelector('#channel_' + String(channel_id) +' p').innerHTML = '';
    const response = await fetch("/api/get_channel_name", {
      method: 'GET',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'channel_id': channel_id
                }
    });
    const data = await response.json();
    if (data['success']){
      let channel_name = data['channel_name'];
      CHANNEL.querySelector('#channel-page-title-name').innerHTML = "# " + channel_name;
      edit_button = CHANNEL.querySelector('.channel-page-title-container a');
      edit_button.addEventListener('click', async function(){
        await changeChannelName(channel_id, channel_name);
      })
    }
  }catch(err){
    console.log(err);
  }

}

async function loadOneChannelPage(push_history = true, channel_id){
  try{
    await loadChannelsPage(push_history = false);
    console.log("loading:" + String(channel_id) +  " channel page")
    CHANNEL.style.display = "block";
    await changeChannelDisplay(channel_id);
  
    if (push_history){
      let channel_url = '/channels/' + channel_id;
      history.pushState({"page": "channels"}, null, channel_url);
    }
  
    let post_button = CHANNEL.querySelector("#channel-page-send-btn");
    post_button.addEventListener('click', async function () {
      await postMessage();
    });
    startMessagePolling();
    messages_interval = setInterval(startMessagePolling, 500)
    // await startMessagePolling();
  }catch(err){
    console.log(err);
  }
}


// show message
async function showOneMessage(message) {
  try{
    let message_container = document.createElement("message");
    let message_avatar = document.createElement("img");
    message_avatar.setAttribute("src", "/static/images/avatar-default.jpg");
    message_avatar.setAttribute("id", "Avatar");
    let message_username = document.createElement("div");
    message_username.setAttribute("id", "message_id");
    message_username.setAttribute("hidden", true);
    message_username.innerHTML = message['username'];
    message_container.appendChild(message_avatar)
    message_container.appendChild(message_username)

    
    let img_url = await getImgUrl(message['message_body']);
    let message_body = document.createElement("p");
    message_body.innerHTML = message['username'] + ":  " + message['message_body'].replace(img_url, "");
    message_container.appendChild(message_body)
    if (img_url){
      let message_img = document.createElement("img");
      message_img.setAttribute("src", img_url);
      message_img.setAttribute("id", "channel-page-img");
      message_container.appendChild(message_img);
    }
    let rely_num = message['message_replies_num'];
    let message_rely_num = document.createElement("a");
    message_rely_num.setAttribute("class", "channel-page-reply-count");
    message_rely_num.innerText = "(# of reply: " + rely_num + ")";
    message_rely_num.href = "/channels" + "/" + message['channel_id'] + "/" + message['message_id'];
    message_container.appendChild(message_rely_num);
    message_container.appendChild(await createEmojiClass(message['message_id']));

    return message_container

  }catch (err){
    console.log(err);
  }

}


async function showAllMessages(all_messages) {
  try{
    let messages_container = CHANNEL.querySelector(".channel-page-content-container");
    messages_container.innerHTML = "";
    if (CHANNEL.getElementsByTagName("message").length == all_messages.length || all_messages['success'] == false){
      //if no new comment, won't rebuild all the comment
      console.log('no more messages')
      return;
    }
    all_messages.forEach(async (element) => {
      messages_container.append(await showOneMessage(element));
    });
  }catch(err){
    console.log(err);
  }

}

async function startMessagePolling() {
  try{
    // /api/get_message (POST)
    let url = window.location.pathname.split("/");
    let channel_id = url[2];

    // if (url[1] == 'channels'){
    //   setTimeout(startMessagePolling, 5000);
    // }
    console.log("polling for channel " + String(channel_id) + "'s new messages");
    const response = await fetch("/api/get_messages", {
      method: 'POST',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'channel_id': channel_id
                }
    });
    const data = await response.json();
    if (data['success'] == false){
      console.log(data['err']);
      return;
    }
    await showAllMessages(data);   
  }catch(err){
    console.log(err);
  };
}

async function postMessage() {
  // /api/post_message (POST)
  try {
    let new_message = CHANNEL.querySelector("textarea[name=channel-page-send-message]").value;
    let url = window.location.pathname.split("/");
    let channel_id = url[2];

    if (new_message == ""){
      alert("Comment cannot be empty");
      return false;
    }
    const response = await fetch("/api/post_message", {
      method: 'POST',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'channel_id': channel_id
                },
      body: JSON.stringify({new_message})
    });
    const data = await response.json();
    if (data['success'] == false){
        console.log("post fail");
    }else{
        console.log("new message posted");
    }
  }catch(err){
    console.log(err);
  }

}


// function updateRoomName() {
// }



// ------------------------------------Page: /channels/<int:channel_id>/<int:message_id>------------------------------------
// Load thread page
async function changeThreadDisplay(channel_id, message_id){
  try{
    // console.log("show original message");
    const reponse = await fetch("/api/get_message_by_id", {
      method: 'GET',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'message_id': message_id
                }
      });
    const data = await reponse.json();
    if (data['success'] == true){
      THREAD.querySelector('#thread-page-title-name').innerHTML = "# Replies to " + data['username'] + ":";
      THREAD.querySelector('#thread-page-title-name').href = "/channels/" + String(channel_id);
      THREAD.querySelector('#thread-page-title-content').innerHTML = data['message_body'];
    }
  }catch(err){
    console.log(err);
  }
}

async function loadThreadPage(push_history = true, channel_id, message_id){
  try{
    await loadChannelsPage(push_history = false);
    await loadOneChannelPage(push_history = false, channel_id);
    console.log("load one thread page")
    THREAD.style.display = "block";
    changeChannelSize();
    await changeThreadDisplay(channel_id, message_id);


    if (push_history){
      let thread_url = '/channels/' + channel_id + '/' + message_id;
      history.pushState({"page": "thread"}, null, thread_url);
    }

    let post_button = THREAD.querySelector("#thread-page-send-btn");
    post_button.addEventListener('click', async function () {
      await postReply();
    });
    let close_button = THREAD.querySelector('#thread-close-btn');
    close_button.href = '/channels/' + channel_id;
    await startReplyPolling();
    replies_interval = setInterval(startReplyPolling, 500);
    // startMessagePolling
    // await startReplyPolling();
  }catch(err){
    console.log(err);
  }
}

async function showOneReply(reply){
  // <img src="/static/images/avatar-default.jpg" alt="Avatar">
  // <p>message_username: message_body</p>
  // <span>message_dontknow</span>
  try{
    let reply_container = document.createElement('reply');
    let reply_avatar = document.createElement('img');
    reply_avatar.setAttribute('src', "/static/images/avatar-default.jpg");
    reply_avatar.setAttribute('alt', "Avatar");
    let reply_body = document.createElement('p');
    reply_body.innerHTML = reply['username'] + ": " + reply['message_body'];
    reply_container.appendChild(reply_avatar);
    reply_container.appendChild(reply_body);
    reply_container.appendChild(await createEmojiClass(reply['message_id']));

    return reply_container;
  }catch(err){
    console.log(err);
  }

}

async function showAllReply(all_replies){
  try{
    let replies_container = THREAD.querySelector(".thread-page-content");
    replies_container.innerHTML = "";
    if (THREAD.getElementsByTagName("reply").length == all_replies.length){
      //if no new comment, won't rebuild all the comment
      return;
    }
    all_replies.forEach(async (element) => {
      replies_container.append(await showOneReply(element));
    });
    return;
  }catch(err){
    console.log(err);
  }
}

async function startReplyPolling(){
  try{
    let url = window.location.pathname.split("/");
    let message_id = url[3];

    // if (url[1] == 'channels'){
    //   setTimeout(startMessagePolling, 5000);
    // }
    console.log("polling for message" + String(message_id) + "'s new replies");
    const reponse = await fetch("/api/get_reply", {
      method: 'GET',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'message_id': message_id
                }
      });
    const data = await reponse.json();
    if (data['success'] == false){
      console.log(data['err'])
      return;
    }
    await showAllReply(data);
  }catch(err){
    console.log(err);
  }
}

async function postReply(){
  // /api/post_reply (POST)

  try{    
    let new_reply = THREAD.querySelector("textarea[name=thread-page-send-text-area]").value;
    let url = window.location.pathname.split("/");
    let channel_id = url[2];
    let message_id = url[3];

    if (new_reply == ""){
      alert("Reply cannot be empty");
      return false;
    }
    const response = await fetch("/api/post_reply", {
      method: 'POST',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'channel_id': channel_id,
                'message_id': message_id
                },
      body: JSON.stringify({new_reply})
    });
    const data = await response.json();
    if (data['success'] == false){
        console.log("post fail");
    }else{
        console.log("new reply posted");
    }
  }catch(err){
    console.log(err);
  }

}

// **************************** profile page
async function loadProfile(push_history = true){
  console.log("load profile");
  LOGIN.style.display = "none";
  CHANNEL_WHOLE.style.display = "none";
  PROFILE.style.display = "block";
  clearInterval(channels_interval);
  clearInterval(messages_interval);
  clearInterval(replies_interval);

  PROFILE.querySelector('.login-form-title').innerHTML += ', ' + getUsername();

  if (push_history){
    history.pushState({"page": "profile"}, null, '/profile');
  }
  let change_username_button = PROFILE.querySelector("#change_username_button");
  change_username_button.addEventListener('click', async function(){
    await changeUsername();
  })

  let change_password_button = PROFILE.querySelector("#change_password_button");
  change_password_button.addEventListener('click', async function(){
    await changePassword();
  })

  let back_button = PROFILE.querySelector("a");
  back_button.href = '/channels';

}

async function changeUsername() {
  try{
    let new_name = PROFILE.querySelector("input[name=username]").value;
    if (new_name == getUsername()){
      alert ('New username repeat with old username');
      return false;
    }
    if (isEmpty(new_name)){
      alert("Can not input empty");
      return false;
    }
    const response = await fetch("/api/update_username", {
      method: "POST",
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'new_name': new_name}
    });
    const data = await response.json();
    if (data['success']){
      LOCALSTORAGE.setItem("username", new_name);
      alert("change username success!");
      location.href = '/profile';
    }else{
      console.log("change username failed!" + data['err']);
    }
  }catch(err){
    console.log(err);
  }
}

async function changePassword() {
  try{
    let old_password = PROFILE.querySelector("input[name=old_password").value;
    let new_password = PROFILE.querySelector("input[name=password]").value;
    if (isEmpty(old_password) || isEmpty(new_password)){
      alert("Can not input empty");
      return false;
    }
    if (old_password == new_password){
      alert('Your password did not change!');
      return false;
    }
    const response = await fetch("/api/update_password", {
      method: "POST",
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'old_password': old_password,
                'new_password': new_password}
    });
    const data = await response.json();
    if (data['success']){
      alert("change password success!");
      location.href = '/profile';
    }else{
      console.log("change password failed!" + data['err']);
    }
  }catch(err){
    console.log(err);
  }
}


// -------------------------------- emoji helper -----------------------------------------------
async function createEmojiClass(message_id){
  try{
    let emoji_container = document.createElement('div');
    emoji_container.setAttribute("class", "emoji");
    for (let i = 0; i < EMOJI_LIST.length; i++){
      cnt_emoji = EMOJI_LIST[i]
      emoji_button = document.createElement('button');
      emoji_button.innerHTML = cnt_emoji;
      emoji_button.addEventListener('click', (function(i){
        return async function() {await addEmoji(i, message_id)}
      })(i)) //can not use async function here
      emoji_container.appendChild(emoji_button);
      emoji_button.addEventListener('mouseenter', (function(i){
        return async function() {
          let emoji_user_container =  await getEmojiUser(i, message_id);
          emoji_container.insertBefore(emoji_user_container, emoji_container.firstChild);
        }
      })(i))
      emoji_button.addEventListener('mouseleave', function(){
        if (document.querySelector('.emoji .emoji-users') != null){
          emoji_container.removeChild(document.querySelector('.emoji .emoji-users'));
        }
      })
    }
    return emoji_container;
  }catch(err){
    console.log(err);
  }
}

async function addEmoji(emoji_id, message_id){
  try{
    const response = await fetch("/api/emoji", {
      method: 'POST',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'message_id': message_id,
                'emoji_id': emoji_id
                }
    });
    const data = await response.json();
    if (data['success'] == false){
        console.log(data['err']);
        if (data['err'] == 'repeat reaction'){
          alert('repeat reaction');
          return;
        }
    }else{
        alert('Hey you reacted!');
        console.log("new emoji:" + String(emoji_id) + "posted to message" + String(message_id));
    }
  }catch(err){
    console.log(err);
  }
}

async function getEmojiUser(emoji_id, message_id){
  try{
    let emoji_user_container = document.createElement('p');
    emoji_user_container.setAttribute('class','emoji-users');
    const response = await fetch("/api/emoji", {
      method: 'GET',
      headers: {'Content-type': "application/json; charset=UTF-8",
                'api_key': getApiKey(),
                'user_id': getUserId(),
                'message_id': message_id,
                'emoji_id': emoji_id
                }
    });
    const data = await response.json();
    if (data['success'] == false){
        console.log(data['err']);
        emoji_user_container.innerHTML = 'no one reacted with:' + EMOJI_LIST[emoji_id];
        return emoji_user_container;
    }else{
        emoji_user_container.innerHTML = data + ' reacted with:' + EMOJI_LIST[emoji_id];
        return emoji_user_container;
    }
  }catch(err){
    console.log(err);
  }
}


// -------------------------------- dropdown -----------------------------------------------

var changeInfoButton = document.getElementById("dropdown-change-info");
var logoutButton = document.getElementById("dropdown-logout");
var logoutButton2 = document.getElementById("narrow-logout");


function dropdown() {
  document.getElementById("myDropdown").classList.toggle("show");
}


window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }  

}
logoutButton.addEventListener('click', function(){
  LOCALSTORAGE.clear();
  history.pushState({}, null, '/');
  clearInterval(channels_interval);
  clearInterval(messages_interval);
  clearInterval(replies_interval);
  loadLogin(push_history=true);
})

logoutButton2.addEventListener('click', function(){
  LOCALSTORAGE.clear();
  history.pushState({}, null, '/');
  clearInterval(channels_interval);
  clearInterval(messages_interval);
  clearInterval(replies_interval);
  loadLogin(push_history=true);
})

changeInfoButton.addEventListener('click', async function(){
  await loadProfile(push_history = true);
})


// -------------------------------- helper -----------------------------------------------
function isEmpty(input_string) {
  // check if a string is empty
  return !input_string.trim().length;
}

function getApiKey() {
  return LOCALSTORAGE.getItem("xqoasis_belay_auth_key");
}

function getUsername() {
  return LOCALSTORAGE.getItem("username");
}

function getUserId() {
  return LOCALSTORAGE.getItem("user_id");
}

function getImgUrl(message_body) {
  var reg = /https:\/\/.*?(gif|png|jpg|jpeg)/gi;
  ImgUrl = message_body.match(reg);
  if (ImgUrl == null){
    return "";
  }
  return ImgUrl[0];
}

function changeChannelSize(){
  CHANNEL.querySelector('.channel-page-title-container').setAttribute('style', 'width: 52%');
  CHANNEL.querySelector('.channel-page-content-big-container').setAttribute('style', 'width: 52%');
  CHANNEL.querySelector('.channel-page-send-container').setAttribute('style', 'width: 52%');
}
