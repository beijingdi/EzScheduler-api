let dbParams = {};
if (process.env.DATABASE_URL) {
  dbParams.connectionString = process.env.DATABASE_URL;
} else {
  dbParams = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  };
}

const { count, Console } = require("console");
const { create } = require("domain");
const { Pool } = require("pg");
const { resourceLimits } = require("worker_threads");
const pool = new Pool(dbParams);

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(
      `INSERT INTO users (name, email, password)
       VALUES($1, $2, $3)
       RETURNING *;`, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get the user name from the database given their id.
 * @param {Number} id The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getInfoById = function(id) {
  return pool
    .query(
      `SELECT name, email FROM users
       WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(
      `SELECT * FROM users
       WHERE email = $1`, [email])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

const getAllUsers = () => {
  return pool
    .query(
      `SELECT id, name, email FROM users;`)
    .then((data) => {
      const users = data.rows;
      return users;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

const getAllEvents = () => {
  return pool
    .query(
      `SELECT * FROM events;`)
    .then((data) => {
      const events = data.rows;
      return events;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//get the events that created by the given user
//output: [event_id, title, description, start_time, end_time, address, lat, long]
const myCreatedEvents = (user) => {
  return pool
    .query(
      `
    SELECT events.id as event_id, events.name as title, events.description, events.start_time, events.end_time, events.address, events.latitude as lat, events.longtitude as long FROM events
    WHERE user_id = $1
    ORDER BY events.start_time;
    `, [user])
    .then((data) => {
      const events = data.rows;
      return events;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//all event belongs to user or got invited
//output: [event_id, creator, title, description, start_time, end_time, address, lat, long, response]
const getUpcomingEvents = (user) => {
  return pool
    .query(
      `
    SELECT distinct events.id as event_id, events.user_id as creator, events.name as title, events.description, events.start_time, events.end_time, events.address, events.latitude as lat, events.longtitude as long, event_invitees.response as response
    From EVENTS
    Join event_invitees ON events.id = event_invitees.event_id
    WHERE event_invitees.user_id = $1
    ORDER BY events.start_time;
    `, [user])
    .then((data) => {
      const events = data.rows;
      return events;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//show event details for the event page
const showEventDetails = (eventId) => {
  return pool
    .query(
      `
      SELECT events.id as event_id, events.user_id as creator, events.name as title, events.description, events.start_time, events.end_time, events.address, events.latitude as lat, events.longtitude as long, event_invitees.user_id as invitee_id, event_invitees.response as response
      FROM events
      Join event_invitees ON events.id = event_invitees.event_id
      WHERE events.id = $1;
      `, [eventId])
    .then((data) => {
      const event = data.rows;
      return event;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
//create an event
const createEvent = (event) => {
  let eventParams = [event.title, event.description, event.startTime, event.endTime, event.address, event.lat, event.long, event.creator];
  return pool
    .query(
      `
    INSERT INTO events (name, description, start_time, end_time, address, latitude, longtitude, user_id)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
    `, eventParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//create an event
const invite = (invite) => {
  let inviteParams = [invite.response, invite.userId, invite.eventId];
  return pool
    .query(
    `
    INSERT INTO event_invitees (event_id, user_id, response) 
    VALUES ($3, $2, $1)
    RETURNING *;
    `, inviteParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//edit event
//need event id
const editEvent = (event) => {
  let eventParams = [event.title, event.description, event.startTime, event.endTime, event.address, event.lat, event.long, event.creator, event.id];
  return pool
    .query(
      `
    UPDATE events
    SET name = $1, description = $2, start_time = $3, end_time = $4, address = $5, latitude = $6, longtitude = $7, user_id = $8
    WHERE id = $9
    RETURNING *;
    `, eventParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//delete an event with given id
const deleteEvent = (eventId) => {
  return pool
    .query(
      `
    DELETE FROM events
    WHERE id = $1
    RETURNING *;  
    `, [eventId])
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};


//get invitees of an event by given id
const getInvitees = (eventId) => {
  return pool
    .query(
    `
    SELECT * FROM event_invitees
    WHERE event_id = $1;
    `, [eventId])
    .then((data) => {
      const invites = data.rows;
      return invites;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//edit inv (change response)
const responseInvite = (invite) => {
  let inviteParams = [invite.response, invite.userId, invite.eventId];
  return pool
    .query(
      `
    UPDATE event_invitees
    SET response = $1
    WHERE user_id = $2
    AND event_id = $3
    RETURNING *;
    `, inviteParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//delete inv given user id and event id
const deleteInvite = (invite) => {
  let inviteParams = [invite.userId, invite.eventId];
  return pool
    .query(
    `
    DELETE FROM event_invitees
    WHERE user_id = $1
    AND event_id = $2
    RETURNING *;
    `, inviteParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//create a comment
const addComment = (comment) => {
  let commentParams = [ comment.eventId, comment.userId, comment.time, comment.text ];
  return pool
    .query(
    `
    INSERT INTO comments (event_id, user_id, time, comment_text) 
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `, commentParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//get all comments of an event by given id
const getComments = (eventId) => {
  return pool
    .query(
    `
    SELECT comments.id as comment_id, event_id, user_id, name, time, comment_text FROM comments
    JOIN users ON users.id = comments.user_id
    WHERE event_id = $1
    ORDER BY time;
    `, [eventId])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//create a reply
const addReply = (reply) => {
  let replyParams = [ reply.userId, reply.commentId, reply.time, reply.text ];
  return pool
    .query(
    `
    INSERT INTO reply (user_id, comment_id, time, reply_text) 
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `, replyParams)
    .then((data) => {
      return data.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

//get all replys of a comment by given id
const getReply = (commentId) => {
  return pool
    .query(
    `
    SELECT user_id, comment_id, name, time, reply_text FROM reply
    JOIN users ON users.id = reply.user_id
    WHERE comment_id = $1
    ORDER BY time;
    `, [commentId])
    .then((data) => {
      return data.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};



module.exports = {
  addUser,
  getInfoById,
  getUserWithEmail,
  getAllUsers,
  getAllEvents,
  myCreatedEvents,
  getUpcomingEvents,
  createEvent,
  invite,
  editEvent,
  deleteEvent,
  getInvitees,
  responseInvite,
  deleteInvite,
  showEventDetails,
  addComment,
  getComments,
  addReply,
  getReply
};
