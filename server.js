const dotenv = require('dotenv');
const express = require('express');
const http = require('http');
const logger = require('morgan');
const path = require('path');
const router = require('./routes/index');
const { auth } = require('express-openid-connect');
const { Database } = require("sqlite3");
const util = require("util");
const bodyParser = require("body-parser");
const random = require("random-string-generator");
const socket = require("socket.io");
const { Users } = require("./utils/users");
const users = new Users();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyA4IPILDV5Lst-mNbbSbxAFmNGte6hRAhc");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

dotenv.load();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

//shit for post requests
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const config = {
  authRequired: false,
  auth0Logout: true
};

const port = process.env.PORT || 3000;
if (!config.baseURL && !process.env.BASE_URL && process.env.PORT && process.env.NODE_ENV !== 'production') {
  config.baseURL = `http://localhost:${port}`;
}

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) {
  res.locals.user = req.oidc.user;
  next();
});

app.use('/', router);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handlers
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

router.get("/projects/data", (req, res) => {
  let udb = new Database("./database/members.db");
  let pdb = new Database("./database/projects.db");
  udb.all(`SELECT * FROM members WHERE projectid = ?`, req.query.projectid, (err, rows) => {
    if (rows.length === 0) {
      pdb.all(`SELECT * FROM projects WHERE projectid = ?`, req.query.projectid, (err, row) => {
        res.send(row);
      })
    } else {
      res.send(rows);
    }
  })
});


setInterval(() => {
  var k;
  let db = new Database("./database/projects.db");
  let mdb = new Database("./database/members.db");
  mdb.all = util.promisify(mdb.all);
  db.all('SELECT * FROM projects', (err, rows) => {
    for (k in rows) {
      router.get(`/projects/${rows[k].projectid}`, (req, res) => {
        res.sendFile(__dirname + "/routes/project.html");
      });
    }
  })
}, 200);

setInterval(() => {
  var k;
  let db = new Database("./database/projects.db");
  db.all('SELECT * FROM projects', (err, rows) => {
    for (k in rows) {
      router.get(`/edit/${rows[k].projectid}`, (req, res) => {
        if (rows[k].usernick !== req.oidc.user.nickname) return res.redirect("/projects");
        res.sendFile(__dirname + "/routes/edit.html");
      });
    }
  })
}, 400);


router.get("/projects/resources", async (req, res) => {
  let projectid = req.query.projectid;
  res.sendFile(__dirname + "/routes/resources.html")
})

router.get("/projects/resource", async (req, res) => {
  let projectid = req.query.projectid;
  let db = new Database("./database/projects.db");
  let rdb = new Database("./database/resources.db");
  rdb.get(`SELECT * FROM resources WHERE projectid = ?`, projectid, (err, row) => {
    if (row === undefined) {
      db.get(`SELECT * FROM projects WHERE projectid = ?`, projectid, async (err, rows) => {
        const prompt = `Suggest me the resources needed for my project named ${rows.projectname} which has it's description as ${rows.description} give response in points with proper formatting and also suggest the most appropriate resource links related to the projects from the internet.`;
        const result = await model.generateContent(prompt);
        res.send(result.response.text());
        rdb.all(`INSERT INTO resources(projectid, resource) VALUES(?,?)`, projectid, result.response.text());
      });
    } else {
      res.send(row.resource.toString());
    }
  })
});

router.get("/history", (req, res) => {
  res.sendFile(__dirname + "/routes/history.html");
})

router.get("/historyget", (req, res) => {
  let projectid = req.query.projectid;
  let hdb = new Database("./database/history.db");
  hdb.all(`SELECT * FROM history WHERE projectid = ? ORDER BY time DESC`, projectid, (err, rows) => {
    console.log(err);
    res.send(rows);
  })
});

router.post("/regenerate", async (req, res) => {
  let rdb = new Database("./database/resources.db");
  const prompt = req.body.prompt;
  const result = await model.generateContent(prompt);
  rdb.all(`UPDATE resources SET resource = ? WHERE projectid = ?`, result.response.text(), req.body.projectid);
  res.send(result.response.text());
})

router.post("/submit", (req, res) => {
  let db = new Database("./database/projects.db");
  let mdb = new Database("./database/members.db");
  let hdb = new Database("./database/history.db");
  db.all(`UPDATE projects SET projectname = ?, description = ? WHERE projectid = ?`, req.body.title, req.body.description, req.body.projectid, (err, rows) => {
    mdb.all(`UPDATE members SET projectname = ?, description = ? WHERE projectid = ?`, req.body.title, req.body.description, req.body.projectid, error => console.log(error));
    console.log(err);
    res.status(200).send("Success!");
    hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, req.body.projectid, `The project's name was changed to "${req.body.title}" and description to "${req.body.description}" by the Owner`, req.oidc.user.nickname, new Date().toUTCString(), (err, rows) => console.log(err));
  });
})

router.post("/create", (req, res) => {
  let db = new Database("./database/projects.db");
  let mdb = new Database("./database/members.db");
  let hdb = new Database("./database/history.db");
  let projectid = random('alphanumeric')
  db.all(`INSERT INTO projects(usernick, type, projectname, projectid, description) VALUES(?,?,?,?,?)`, req.oidc.user.nickname, req.body.ptype, req.body.title, projectid, req.body.description, (err, rows) => {
    console.log(err);
    mdb.all(`INSERT INTO members(projectid, usernick, role, email, plink, projectname, description, type, fullname) VALUES(?,?,?,?,?,?,?,?,?)`, projectid, req.oidc.user.nickname, "Owner", req.oidc.user.email, req.oidc.user.picture, req.body.title, req.body.description, req.body.ptype, req.oidc.user.name, (err, row) => console.log(err));
    res.status(200).send("Success!");
    hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, projectid, `The project was created by the Owner!`, req.oidc.user.nickname, new Date().toUTCString(), (err, rows) => console.log(err));
  });
})

router.post("/delete", (req, res) => {
  let db = new Database("./database/projects.db");
  let mdb = new Database("./database/members.db");
  let hdb = new Database("./database/history.db");
  db.all(`DELETE FROM projects WHERE projectid = ?`, req.body.projectid, (err, rows) => console.log(err));
  mdb.all(`DELETE FROM members WHERE projectid = ?`, req.body.projectid, (err, rows) => console.log(err));
  hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, req.body.projectid, `The project was deleted by the Owner!`, req.oidc.user.nickname, new Date().toUTCString(), (err, rows) => console.log(err));
  res.status(200).send("Success!");
});

router.post("/projects/addmember", (req, res) => {
  let email = req.body.id;
  let projectid = req.body.pid;
  if (email === req.oidc.user.email) return res.status(400).send("You cannot add yourself as a member of the project you created!");
  let udb = new Database("./database/users.db");
  let mdb = new Database("./database/members.db");
  let pdb = new Database("./database/projects.db");
  let hdb = new Database("./database/history.db");
  udb.get(`SELECT * FROM users WHERE email = ?`, email, async (err, rows) => {
    if (rows === undefined) return res.status(400).send("The specified user is not registered so cannot be added to a project!");
    pdb.get(`SELECT * FROM projects WHERE projectid = ?`, projectid, (err, pdata) => {
      mdb.all(`INSERT INTO members(projectid, usernick, role, email, plink, projectname, description, type, fullname) VALUES(?,?,?,?,?,?,?,?,?)`, projectid, rows.usernick, "Member", email, rows.plink, pdata.projectname, pdata.description, pdata.type, rows.fullname, (err, row) => console.log(err));
      res.status(200).send("Success!");
      hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, projectid, `${email} was added to the project by the Owner!`, req.oidc.user.nickname, new Date().toUTCString(), (err, rows) => console.log(err));
    });
  })
})

router.post("/rmember", (req, res) => {
  let mdb = new Database("./database/members.db");
  let hdb = new Database("./database/history.db");
  mdb.all(`DELETE FROM members WHERE usernick = ? AND projectid = ?`, req.body.id, req.body.pid, (err, rows) => {
    console.log(err);
    res.status(200).send("Success!");
    hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, req.body.pid, `${req.body.fname}(${req.body.id}) was removed from the project by the Owner!`, req.oidc.user.nickname, new Date().toUTCString(), (err, rows) => console.log(err));
  });
});

router.post("/leaveProject", (req, res) => {
  let mdb = new Database("./database/members.db");
  let hdb = new Database("./database/history.db");
  mdb.all(`DELETE FROM members WHERE usernick = ? AND projectid = ?`, req.body.name, req.body.pid, (err, rows) => {
    console.log(err);
    res.status(200).send("Success!");
    hdb.all(`INSERT INTO history(projectid, action, user, time) VALUES(?,?,?,?)`, req.body.pid, `${req.body.fullname} left the project!`, req.body.name, new Date().toUTCString(), (err, rows) => console.log(err));
  });
});

router.post("/filter", (req, res) => {
  let pdb = new Database("./database/projects.db");
  pdb.all(`SELECT * FROM projects WHERE type = ? AND usernick = ?`, req.body.type, req.oidc.user.nickname, (err, rows) => {
    res.send(rows);
  })
})

router.post("/filterShared", (req, res) => {
  let mdb = new Database("./database/members.db");
  mdb.all(`SELECT * FROM members WHERE type = ? AND usernick = ?`, req.body.type, req.oidc.user.nickname, (err, rows) => {
    res.send(rows);
    console.log(rows);
  })
})

const server = http.createServer(app)
  .listen(port, () => {
    console.log(`Listening on ${config.baseURL}`);
  });

let generateMessage = (from, text, plink) => {
  return {
    from,
    text,
    plink,
    createdAt: new Date().toUTCString().split(' ')[0]
  };
};

const io = new socket.Server(server);

router.get("/projects/chat", (req, res) => {
  res.sendFile(__dirname + "/routes/chat.html");
});

//for whiteboard
let connections = [];

io.on("connection", socket => {
  //this only for whiteboard
  connections.push(socket);
  console.log("koi toh aaya hai");
  socket.on('join', params => {
    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room, params.plink, params.roomName);

    io.to(params.room).emit('updateUsersList', users.getUserList(params.room));
    socket.emit('newMessage', generateMessage('Admin', `Welocome to ${params.roomName}!`, "/Logos/server.png"));

    socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', "New User Joined!", "/Logos/server.png"));
  })

  socket.on('createMessage', message => {
    let user = users.getUser(socket.id);
    io.to(user.room).emit('newMessage', generateMessage(user.name, message.text, user.plink));
  });

  //for whiteboard only
  socket.on('draw', data => {
    console.log(data);
    socket.broadcast.emit('ondraw', { xc: data.xc, yc: data.yc, projectid: data.projectid });
  })

  socket.on('down', data => {
    socket.broadcast.emit('ondown', { xc: data.xc, yc: data.yc, projectid: data.projectid });
  })

  socket.on('disconnect', () => {
    //for whiteboard connections part only
    connections = connections.filter((con) => con.id !== socket.id);
    let user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
      io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left ${user.roomName} chat room.`, "/Logos/server.png"))
    }
  });

  socket.on('notificationMemberAdd', m => {
    io.emit('notificationMemberAddSent', m);
    console.log("Notification received on backend")
  })

  socket.on('notificationMemberRemove', m => {
    io.emit('notificationMemberRemoveSent', m);
    console.log("Notification received on backend")
  })

  socket.on('notificationProjectLeave', m => {
    let mdb = new Database("./database/members.db", err => console.log(err));
    mdb.all(`SELECT email FROM members WHERE projectid = ?`, m.projectid, (err, rows) => {
      m.members = rows;
      io.emit('notificationProjectLeaveSent', m);
      console.log("Notification received on backend")
    })
  })

  socket.on('notificationProjectUpdate', m => {
    let mdb = new Database("./database/members.db", err => console.log(err));
    mdb.all(`SELECT email FROM members WHERE projectid = ?`, m.projectid, (err, rows) => {
      m.members = rows;
      console.log(m)
      io.emit('notificationProjectUpdateSent', m);
      console.log("Notification received on backend")
    })
  })
});

router.get('/whiteboard', (req, res) => {
  let projectid = req.query.projectid;
  res.sendFile(__dirname + "/routes/whiteboard.html");
})


