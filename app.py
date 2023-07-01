import string
# import traceback
import random
import sqlite3
from datetime import datetime
from flask import *
from functools import wraps
# import bcrypt
# import configparser

MY_API_PREFIX = 'xqoasis_'

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0



# -------------------------------- DATABASE FUNCTION -----------------------------------------------

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.db')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None


# -------------------------------- USER ROUTES -----------------------------------------------
@app.route('/')
@app.route('/login')
@app.route('/profile')
@app.route('/channels')
@app.route('/channels/<int:channel_id>')
@app.route('/channels/<int:channel_id>/<int:message_id>')
def index(channel_id = None, message_id = None):
    return app.send_static_file('index.html')

# @app.errorhandler(404)
# def page_not_found(e):
#     return app.send_static_file('404.html'), 404

# -------------------------------- API ROUTES -----------------------------------------------
# -------------------------------- check and authentic -----------------------------------------------

@app.route('/api/check_credential', methods=['GET'])
def check_credential():
    if not check_credential_helper(request):
        return jsonify({"credential": False})
    else:
        return jsonify({"credential": True})
    

@app.route('/api/login', methods = ['GET'])
def login():
    # print("login api called")
    username = request.headers["username"]
    password = request.headers["password"]
    user = query_db('select * from users where username = ? and password = ?', [username, password], one=True)
    if user:
        api_key = user['api_key']
        user_id = user['user_id']
        print("success login")
        return jsonify({'success': True, 'api_key': api_key, 'user_id': user_id, 'username': username})
    else:
        return jsonify({'success': False})

@app.route('/api/signup', methods = ['POST'])
def signup():
    # print("sign up api called")
    username = request.headers["username"]
    password = request.headers["password"]
    user = query_db('select * from users where username = ?', [username], one=True)
    if user:
        return jsonify({'success': False, 'err': "Repeat username"})
    else:
        user = new_user(username, password)
        return jsonify({'success': True,
                        'user_id': user['user_id'],
                        'username': user['username'],
                        'api_key': user['api_key']})

# -------------------------------- CHANNEL LIST(SIDE BAR) -----------------------------------------------
@app.route('/api/get_channels', methods=['GET'])
def channel_list():
    if check_credential_helper(request):
        channel_ids, channel_names, channel_message_counts = get_channels()
        if not channel_ids:
            return jsonify({"result": "empty"})

        channel_unread_message_counts = get_channel_unread_message_counts(channel_ids,
                                                                          channel_message_counts,
                                                                          request.headers["user_id"])
        channel_list = []
        for i in range(len(channel_ids)):
            channel_list.append({"channel_id" : channel_ids[i], "channel_name": channel_names[i],
                                 "channel_unread_message_counts": channel_unread_message_counts[i]})
        return channel_list
    else:
        return jsonify({"success": False})


def get_channels():
    channel_info = query_db(
        "select channels.channel_id, channels.channel_name, count(message_id) from channels left join messages on messages.channel_id = channels.channel_id where reply_message_id is NULL group by channels.channel_id"
    )
    return [str(channel[0]) for channel in channel_info], [channel[1] for channel in channel_info], [int(channel[2]) for channel in
                                                                                     channel_info]
    


@app.route('/api/create_channel', methods=['POST'])
def create_channels():
    print("create room")
    if check_credential_helper(request):
        new_channel_name = request.headers['new_channel_name']
        channel = query_db('select * from channels where channel_name = ?', [new_channel_name], one=True)
        if channel:
            return jsonify({'success': False, 'err': "Repeat channel name"})
        else:
            channel = new_channel(new_channel_name)
            return jsonify({'success': True,
                            'channel_id': channel['channel_id'],
                            'channel_name': channel['channel_name']})


@app.route('/api/get_channel_name', methods = ['GET'])
def get_channel_name():
    channel_id = request.headers['channel_id']
    if check_credential_helper(request):
        channel = query_db('select * from channels where channel_id = ?', channel_id, one=True)
        if channel:
            return jsonify({"success": True,
                            "channel_id": channel_id,
                            "channel_name": channel['channel_name']})
    return jsonify({"success": False})

# -------------------------------- MESSAGES -----------------------------------------------

@app.route('/api/get_messages', methods = ['POST'])
def get_message_report_last():
    # this api will change the data in message_seen, so use POST method
    user_id = request.headers['user_id']
    channel_id = (int)(request.headers['channel_id'])
    if check_credential_helper(request):
        channel = query_db('select * from channels where channel_id = ?', [channel_id], one=True)
        if not channel:
            return jsonify({"success": False,
                            "err": "no room"})
        channel_messages = query_db('select * from messages inner join users on messages.user_id = users.user_id where channel_id = ? and reply_message_id is NULL', [channel_id])
        if not channel_messages:
            return jsonify({"success": False,
                            "err": "no messages"})
        messages_list = []
        for m in channel_messages:
            message_replies_num = query_db('select count(message_id) from messages where reply_message_id = ?', [m['message_id']])
            # print('message_replies_num[0][0]' + str(message_replies_num[0][0]))
            messages_list.append({"message_id": m['message_id'], "message_body": m['message_body'], "user_id" : m['user_id'], "username": m['username'], "channel_id": m['channel_id'],
                                  "message_replies_num": message_replies_num[0][0], "reply_message_id": m['reply_message_id']})
        report_last_helper(user_id, channel_id, messages_list)
        return messages_list
    
def report_last_helper(user_id, channel_id, messages_list):
    last_message_id = query_db('select message_seen_id from message_seen where channel_id = ? and user_id = ?', [channel_id, user_id])
    cnt_message_id = messages_list[-1]['message_id']
    # print('cnt_message_id: ' + str(cnt_message_id) + ', last_message_id: ' + str(last_message_id[-1]['message_seen_id']))
    if not last_message_id or int(last_message_id[-1]['message_seen_id'])!= int(cnt_message_id):
        print("Inserted:", user_id, channel_id, cnt_message_id)
        query_db('insert into message_seen (user_id, channel_id, message_seen_id) values (?, ?, ?)',
                [user_id, channel_id, cnt_message_id])
    else:
        print("have seen the latest message")



@app.route('/api/post_message', methods = ["POST"])
def post_message():
    channel_id = request.headers['channel_id']
    if check_credential_helper(request):
        user = get_user_from_header(request)
        new_message = request.json['new_message']
        query_db('insert into messages (user_id, channel_id, message_body) ' + 
        'values (?, ?, ?)',(user['user_id'], channel_id, new_message),one=True)
        return jsonify({"success": True})
    return jsonify({"success": False})


# -------------------------------- REPLIES -----------------------------------------------

@app.route('/api/get_reply', methods=['GET'])
def get_reply():
    message_id = (int)(request.headers['message_id'])
    if check_credential_helper(request):
        message = query_db('select * from messages where message_id = ? and reply_message_id is NULL', [message_id], one=True)
        if not message:
            return jsonify({"success": False,
                            "err": "no this message"})
        message_replies = query_db('select * from messages inner join users on messages.user_id = users.user_id where reply_message_id = ?', [message_id])
        if not message_replies:
            return jsonify({"success": False,
                            "err": "no replies"})
        replies_list = []
        for r in message_replies:
            replies_list.append({"message_id": r['message_id'], "message_body": r['message_body'], "user_id": r['user_id'], "username" : r['username'], "reply_message_id": r['reply_message_id']})
        return replies_list

@app.route('/api/post_reply', methods=['POST'])
def post_reply():
    channel_id = request.headers['channel_id']
    message_id = request.headers['message_id']
    if check_credential_helper(request):
        user = get_user_from_header(request)
        new_reply = request.json['new_reply']
        query_db('insert into messages (message_body, user_id, channel_id, reply_message_id) ' + 
        'values (?, ?, ?, ?)',(new_reply, user['user_id'], channel_id, message_id),one=True)
        return jsonify({"success": True})
    return jsonify({"success": False})

# -------------------------------- EMOJI -----------------------------------------------


@app.route('/api/emoji', methods = ['GET', 'POST'])
def handle_emoji():
    if check_credential_helper(request):
        message_id = request.headers['message_id']
        emoji_id = request.headers['emoji_id']
        if request.method == 'GET':
            emoji_user_info = query_db('select username from reactions inner join users on reactions.user_id = users.user_id where emoji_id = ? and reaction_message_id = ?', [emoji_id, message_id])
            if emoji_user_info:
                usernames = []
                for emoji_user in emoji_user_info:
                    usernames.append(emoji_user['username'])
                return usernames
            else:
                return jsonify({'success': False,
                                'err': 'no users'})
        else:
            user_id = request.headers['user_id']
            cnt_reaction = query_db('select * from reactions where emoji_id = ? and user_id = ? and reaction_message_id = ?', [emoji_id, user_id, message_id], one=True)
            if not cnt_reaction:
                query_db('insert into reactions (emoji_id, user_id, reaction_message_id) ' + 'values(?, ?, ?)', (emoji_id, user_id, message_id), one=True)
                return jsonify({'success': True})
            else:
                return jsonify({'success': False,
                                'err': 'repeat reaction'})
    else:
        return jsonify({'success': False,
                        'err': 'credential failed'})
    
# -------------------------------- UPDATE INFO -----------------------------------------------

@app.route('/api/update_channel_name', methods = ["POST"])
def update_channel_name():
    channel_id = request.headers["channel_id"]
    if check_credential_helper(request):
        new_channel_name = request.headers["new_channel_name"]
        cnt_channel = query_db('select * from channels where channel_name = ?', [new_channel_name], one=True)
        if not cnt_channel:
            query_db('update channels set channel_name = ? where channel_id = ?', [new_channel_name, channel_id])
            return jsonify({"success": True})
        else:
            return jsonify({"success": False,
                            "err": "name repeated"})
    else:
        return jsonify({"success": False,
                        "err": "credential failed"})

    
@app.route('/api/update_username', methods = ["POST"])
def update_username():
    if check_credential_helper(request):
        user = get_user_from_header(request)
        new_name = request.headers["new_name"]
        cnt_user = query_db('select username from users where username = ?', [new_name], one=True)
        if not cnt_user:
            query_db('update users set username = ? where user_id = ?', [new_name, user['user_id']])
            return jsonify({"success": True})
        else:
            return jsonify({"success": False,
                            "err": "username repeated"})
    else:
        return jsonify({"success": False,
                        "err": "credential failed"})

@app.route('/api/update_password', methods = ["POST"])
def update_password():
    if check_credential_helper(request):
        user = get_user_from_header(request)
        # print(user['password'])
        # print(request.headers['old_password'])
        if user['password'] == request.headers['old_password']:
            new_password = request.headers["new_password"]
            query_db('update users set password = ? where user_id = ?', [new_password, user['user_id']])
            return jsonify({"success": True})
        else:
            return jsonify({"success": False,
                            'err': "old password does not match!"})
    else:
        return jsonify({"success": False,
                        "err": "credential failed!"})



# -------------------------------- Unread Messages Helper Functions -----------------------------------------------


def get_channel_unread_message_counts(channel_ids, channel_message_counts, user_id):
    message_seen_info = query_db(
        "select channel_id, message_seen_id from message_seen where user_id = ?",
        [user_id]
    )
    channel_unread_message_counts = [str(i) for i in channel_message_counts]

    if not message_seen_info:
        return channel_unread_message_counts

    for channel_id, latest_message_id in message_seen_info:
        read_message_count = get_read_message_count(channel_id, latest_message_id)
        channel_index = channel_ids.index(str(channel_id))
        channel_unread_message_counts[channel_index] = str(channel_message_counts[channel_index] - read_message_count)

    return channel_unread_message_counts

def get_read_message_count(channel_id, latest_message_id):
    read_message_info = query_db(
        "select sum(case when message_id <= ? then 1 else 0 end) from messages where channel_id = ? and reply_message_id is NULL",
        [latest_message_id, channel_id]
    )
    return int(read_message_info[0][0])

@app.route('/api/get_message_by_id', methods = ['GET'])
def get_message_by_id():
    if check_credential_helper(request):
        message_id = request.headers['message_id']
        message_info = query_db('select * from messages inner join users on messages.user_id = users.user_id where message_id = ?', [message_id], one=True)
        if message_info:
            return jsonify({"success": True,
                            "user_id": message_info['user_id'],
                            "username": message_info['username'],
                            "message_body": message_info['message_body']})
    return jsonify({"success": False})


# -------------------------------- OTHER HELPER FUNCTION -----------------------------------------------
def get_user_from_header(request):
    user_id = request.headers['user_id']
    return query_db('select * from users where user_id = ?', [user_id], one=True)
    
def check_credential_helper(request):
    user = get_user_from_header(request)
    input_api_key = request.headers['api_key']
    if user:
        return user['api_key'] == input_api_key
    return False

def new_user(username, password):
    api_key = MY_API_PREFIX + ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (username, password, api_key) ' + 
        'values (?, ?, ?) returning user_id, username, password, api_key',
        (username, password, api_key),
        one=True)
    return u

def new_channel(new_channel_name):
    c = query_db('insert into channels (channel_name) ' + 
        'values (?) returning channel_id, channel_name',
        [new_channel_name],
        one=True)
    return c