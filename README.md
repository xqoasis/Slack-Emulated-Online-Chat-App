# Slack-Emulated-Online-Chat-App
My own version of the popular workplace messaging app Slack (Full-stack development)


## Core Behavior

- It lets users send and read real-time chat messages that are organized into rooms called 
  Channels. Users see a list of all the channels on the server and can click one to enter that 
  channel. Inside, they see all the messages posted to that channel by any user, and can post their 
  own messages. All messages belong to a channel and all channels are visible to all users; we don't 
  need to implement private rooms or direct messages.
- Any user can create a new channel by supplying a display name. Channel names must be unique. If 
  you wish, You may choose to limit what characters are allowed in channel names.
- Like Slack, messages may be threaded as Replies in response to a message in a channel. Messages in 
  the channel will display how many replies they have if that number is greater than zero. We don't
  support nested threads; messages either belong directly to a channel or are replies in a thread to 
  a message that does, but replies can't have nested replies of their own.



## Instructions
- run `sqlite3 ./db/belay.db < ./db/20230228T225000-create_tables.sql` to initialize database.
If flask is not installed, run `pip3 install flask`.
- Run `flask run --reload` to start APP.

- Access app in your browser at the URL that Flask prints to the command 
  line, e.g. `* Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)`

- You'd better use virtual (If you have created a python virtual environment) environment.
```
python3 -m venv YOUR_VENV_NAME

. venv/bin/activate

pip3 install Flask

flask run --reload
```

## login and signup page
- They can be mutual converted by clicking the text in the bottom. User can create an account or log in. The username and password should match, and password and repeat password should match, and the new username cannot repeat with exsited username, otherwise it will alert and stop login/signin. Besides, they cannot be empty.

![login](https://user-images.githubusercontent.com/73116717/224192658-13b0475c-6418-4907-b398-ec99c1a5592f.jpg)
![signup](https://user-images.githubusercontent.com/73116717/224192679-8ab9ac5f-1e4a-4d97-86b8-bfbbb7405141.jpg)

## Channel-whole-page
- Users can check channel list (with unread messages), post messages or replies. 

![channel-whole-page](https://user-images.githubusercontent.com/73116717/224193000-5c4c608d-28a2-4577-b40d-69f0f278a0cc.jpg)
![11471678405876_ pic](https://user-images.githubusercontent.com/73116717/224193061-43fd3ded-257a-4cb6-b16c-15c9f89ed732.jpg)

- By clicking settings, users can enter profile page (in the profile page, users can give up changing and back to menu) to change their user information or logout.

![11451678405444_ pic](https://user-images.githubusercontent.com/73116717/224193114-fab04349-e3b8-4b31-a85c-c401b72ae027.jpg)
![11441678405394_ pic](https://user-images.githubusercontent.com/73116717/224193186-60bda8f6-266e-43e5-b7bf-27ebbf7e572c.jpg)

- Users can click emoji to react with messages or hover on those emoji to see who reacted with them.

![11511678406982_ pic](https://user-images.githubusercontent.com/73116717/224193333-b248369b-349e-43f4-86f5-671124befa7d.jpg)

- Users can create channels or change channel's name.

![11521678407013_ pic](https://user-images.githubusercontent.com/73116717/224193404-d0cf554e-96db-4a3d-b587-4afc3e3447b6.jpg)
![11491678406915_ pic](https://user-images.githubusercontent.com/73116717/224193425-59e23ac6-85d5-4259-850b-c7e855f0b93d.jpg)

## Narrow screen layout
- In the narrow screen. The layout would be one-column. There's a new side-menu offering some settings.
![11571678408871_ pic](https://user-images.githubusercontent.com/73116717/224194035-77a25103-ec03-44cb-ae22-e9ddc3be7f75.jpg)