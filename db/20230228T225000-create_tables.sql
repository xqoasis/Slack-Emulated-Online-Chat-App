-- sqlite3 ./db/belay.db < ./db/20230228T225000-create_tables.sql

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
	username VARCHAR(40) NOT NULL,
  password VARCHAR(40) NOT NULL,
  api_key VARCHAR(40) NOT NULL
);

DROP TABLE IF EXISTS channels;
CREATE TABLE IF NOT EXISTS channels (
  channel_id INTEGER PRIMARY KEY,
	channel_name VARCHAR(40) UNIQUE NOT NULL
);

DROP TABLE IF EXISTS messages;
CREATE TABLE IF NOT EXISTS messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_body TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  reply_message_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(channel_id) REFERENCES channels(channel_id),
  FOREIGN KEY(reply_message_id) REFERENCES messages(message_id)
);

DROP TABLE IF EXISTS reactions;
CREATE TABLE IF NOT EXISTS reactions (
  reaction_id INTEGER PRIMARY KEY,
  emoji_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reaction_message_id INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(reaction_message_id) REFERENCES messages(message_id)
);

DROP TABLE IF EXISTS message_seen;
CREATE TABLE IF NOT EXISTS message_seen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  message_seen_id INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(channel_id) REFERENCES channels(channel_id),
  FOREIGN KEY(message_seen_id) REFERENCES messages(message_id)
);
