-- DROP TABLE IF EXISTS message_seen;
-- CREATE TABLE IF NOT EXISTS message_seen (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_id INTEGER NOT NULL,
--   channel_id INTEGER NOT NULL,
--   message_seen_id INTEGER NOT NULL,
--   FOREIGN KEY(user_id) REFERENCES users(user_id),
--   FOREIGN KEY(channel_id) REFERENCES channels(channel_id),
--   FOREIGN KEY(message_seen_id) REFERENCES messages(message_id)
-- );

INSERT INTO message_seen
    (user_id)
    SELECT user_id FROM users

INSERT INTO message_seen
    (channel_id)
    SELECT channel_id FROM channels

INSERT INTO message_seen
    (message_seen_id)
    SELECT message_id FROM messages
