var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const { Database } = require("sqlite3");

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Auth0 Webapp sample Nodejs',
    isAuthenticated: req.oidc.isAuthenticated()
  });
  if (req.oidc.isAuthenticated()) {
    let db = new Database("./database/users.db");
    db.get(`SELECT * FROM users WHERE usernick = ?`, req.oidc.user.nickname, (err, rows) => {
      if (rows === undefined) {
        db.all(`INSERT INTO users(usernick, fullname, plink, email) VALUES(?,?,?,?)`, req.oidc.user.nickname, req.oidc.user.name, req.oidc.user.picture, req.oidc.user.email, (err, rows) => console.log(err));
      } else {
        return;
      }
    })
  }
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page'
  });
});

router.get("/user", requiresAuth(), (req, res, next) => {
  res.send(req.oidc.user);
})

router.get('/projects', (req, res) => {
  res.sendFile(__dirname + "/dashboard.html")
});

router.get("/uprojects", requiresAuth(), (req, res, next) => {
  let db = new Database("./database/projects.db", err => console.log(err));
  db.all(`SELECT * FROM projects WHERE usernick = ?`, req.oidc.user.nickname, (err, rows) => {
    if (err) return res.status(400).send(err);
    if (rows === undefined) {
      res.status(200).send('<span>You are not woking in any projects!</span>');
    } else {
      let a = [];
      var i;
      for (i = 0; i < rows.length; i++) {
        const b = i + 1
        var j;
        let c = [];
        for (j = 0; j < 51; j++) {
          c.push(rows[i].description.split('')[j]);
        }
        if (rows[i].description.split('').length > 50) {
          c.push('....');
        } else {
          c.push(' ');
        }
        a.push('<tr id=row' + rows[i].projectid + ' style="text-align: center;"><th scope="col" style="color: white;">' + b + '</th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + rows[i].projectname + '</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">Owner</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + c.join('') + '</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + rows[i].type + '</p></th><th scope="col" style="color: white;"><div class="button-container"><button class="action-button open-button" onclick="window.location.href = \'/projects/' + rows[i].projectid + '\'"><span class="icon">🔗</span> OPEN</button><button class="action-button edit-button" onclick="window.location.href = \'/edit/' + rows[i].projectid + '/\'"><span class="icon">✏️</span>EDIT</button><button class="action-button open-button" onclick="window.location.href=\'/history?projectid=' + rows[i].projectid + '\'">History</button><button class="action-button delete-button" id=' + rows[i].projectid + ' onclick="deleteProject(this.id)"><span class="icon">🗑️</span>DELETE</button></div></th></tr>')
      }
      res.status(200).send(a.join(''));
    }
  });
});

router.get("/sprojects", requiresAuth(), (req, res, next) => {
  let db = new Database("./database/members.db", err => console.log(err));
  db.all(`SELECT * FROM members WHERE usernick = ?`, req.oidc.user.nickname, (err, rows) => {
    if (err) return res.status(400).send(err);
    if (rows === undefined) {
      res.status(200).send('<span>You are not woking in any projects!</span>');
    } else {
      let a = [];
      var i;
      for (i = 0; i < rows.length; i++) {
        const b = i + 1
        var j;
        let c = [];
        for (j = 0; j < 51; j++) {
          c.push(rows[i].description.split('')[j]);
        }
        if (rows[i].description.split('').length > 50) {
          c.push('....');
        } else {
          c.push(' ');
        }
        if (rows[i].role === "Owner") {
          a.push("");
        } else {
          a.push('<tr id=' + rows[i].projectid + ' style="text-align: center;"><th scope="col" style="color: white;">' + b + '</th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + rows[i].projectname + '</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">Member</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + c.join('') + '</p></th><th scope="col" style="color: white;"><p style="text-decoration: none;">' + rows[i].type + '</p></th><th scope="col" style="color: white;"><div class="button-container"><button class="action-button open-button" id=' + rows[i].projectid + ' onclick="leaveProject(this.id)">Leave Project</button><button class="action-button open-button" onclick="window.location.href=\'/projects/chat?id=' + rows[i].projectid + '\'">Chat Room</button><button class="action-button open-button" onclick="window.location.href=\'/whiteboard?projectid=' + rows[i].projectid + '\'">Whiteboard</button><button class="action-button open-button" onclick="window.location.href=\'/history?projectid=' + rows[i].projectid + '\'">History</button></th></tr>')
        }
      }
      res.status(200).send(a.join(''));
    }
  });
});

module.exports = router;
