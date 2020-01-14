const express = require("express");
const cors = require("cors");
// const mysql = require("mysql");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const fs = require("fs");

const bodyParser = require("body-parser");
const path = require("path");
const app = express();

////////for webRTC//////////

// 로컬 테스트용


// 리모트 테스트용
// const https = require("https");
app.use("/contents", express.static("./contents"));
app.use(
  "/views/examples/conference",
  express.static("./views/examples/conference")
);

// Routes ======================================================================
// require("./controllers/route.js")(app);
app.get("/webRTC", (req, res) => {
  res.render("examples/conference/webRTC.ejs", {
    title: "Streaming Lesson"
  });
});

////////////////////////////

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(
  session({
    secret: "piano",
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
  })
);

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("view options", { layout: false });

// const connection = mysql.createConnection({
//   host: "localhost",
//   user: "young",
//   password: "pianotutoring",
//   database: "piano_tutoring"
// });

// connection.connect(err => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("Connected to the MySQL server");
//   }
// });

let login_state = false;
let user_email;
let user_name;

app.use(express.static("public"));
app.use(cors());

app.get("/", (req, res) => {
  res.render("index", {
    login_state: req.session.logined,
    user_name: req.session.user_name
  });
});

app.post("/", (req, res) => {
  req.session.logined = req.body.login_state;
  req.session.user_email = req.body.user_email;
  req.session.user_name = req.body.user_name;

  console.log(
    `login_state: ${req.session.logined}\n user email: ${req.session.user_email}\n user name: ${req.session.user_name}`
  );

  const FIND_USER_QUERY = `SELECT user_email FROM user WHERE user_email='${req.session.user_email}'`;
  connection.query(FIND_USER_QUERY, (err, results) => {
    console.log(results);
    if (results.length) {
      // 데이터베이스에 등록된 사용자
      console.log("이미 등록된 사용자");
      return res.status(200).json({
        userdata: results
      });
    } else {
      // 새로운 사용자
      console.log("new user!!");
      const INSERT_USER_QUERY = `INSERT INTO user (user_email, user_name) VALUES('${req.session.user_email}', '${req.session.user_name}')`;
      connection.query(INSERT_USER_QUERY, (err, results) => {
        if (err) {
          console.log(err);
          return res.status(404).send(err);
        } else {
          console.log("inserted new user");
          return res.status(200).json({
            userdata: results
          });
        }
      });
    }
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/tutors", (req, res) => {
  const SELECT_TUTOR_INFO_QUERY = `SELECT * FROM tutor`;
  connection.query(SELECT_TUTOR_INFO_QUERY, (err, result) => {
    res.render("tutors", {
      login_state: req.session.logined,
      user_name: req.session.user_name,
      information: result
    });
  });
});

app.get("/tutors-profile", (req, res) => {
  const tid = req.query.tutor_id;
  const SELECT_TUTOR_MOREINFO_QUERY = `SELECT tutor_id,tutor_name,profile_image,long_description FROM tutor WHERE tutor_id=${tid}`;
  const FIND_ENROLL_TUTOR_QUERY = `SELECT * from enroll_tutor WHERE user_email='${req.session.user_email}' and tutor_id=${tid}`;
  const SELECT_TUTOR_LECTURE_QUERY = `SELECT * FROM lecture_videos WHERE tid=${tid}`;
  connection.query(SELECT_TUTOR_MOREINFO_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      connection.query(FIND_ENROLL_TUTOR_QUERY, (err2, result2) => {
        console.log("isEnrolled: ", result2);
        connection.query(SELECT_TUTOR_LECTURE_QUERY, (err3, result3) => {
          console.log(result3);
          res.render("tutors-profile", {
            login_state: req.session.logined,
            user_name: req.session.user_name,
            tutor_info: result,
            isEnrolled: result2,
            lectures: result3
          });
        })
      });
    }
  });
});

app.post("/enroll_tutor", (req, res) => {
  const INSERT_ENROLL_TUTOR_QUERY = `INSERT INTO enroll_tutor(user_email, tutor_id) values ('${req.session.user_email}','${req.body.tid}');`;
  connection.query(INSERT_ENROLL_TUTOR_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      return res.status(200).end();
    }
  });
});

app.get("/songs", (req, res) => {
  const SELECT_SONG_INFO_QUERY = `SELECT * FROM song`;
  connection.query(SELECT_SONG_INFO_QUERY, (err, result) => {
    console.log(result);
    res.render("songs", {
      login_state: req.session.logined,
      user_name: req.session.user_name,
      information: result
    });
  });
});

app.get("/songs-profile", (req, res) => {
  const sid = req.query.song_id;
  const SELECT_SONG_MOREINFO_QUERY = `SELECT song_id,song_name,song_image,artist FROM song WHERE song_id='${sid}'`;
  var FIND_ENROLL_SONG_QUERY = `SELECT * from enroll_song WHERE user_email='${req.session.user_email}' and song_id='${sid}'`;
  connection.query(SELECT_SONG_MOREINFO_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      connection.query(FIND_ENROLL_SONG_QUERY, (err, result2) => {
        res.render("songs-profile", {
          login_state: req.session.logined,
          user_name: req.session.user_name,
          song_info: result,
          isEnrolled: result2
        });
      });
    }
  });
});

app.post("/enroll_song", (req, res) => {
  const INSERT_ENROLL_SONG_QUERY = `INSERT INTO enroll_song(user_email, song_id) values ('${req.session.user_email}','${req.body.sid}');`;
  connection.query(INSERT_ENROLL_SONG_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      return res.status(200).end();
    }
  });
});

app.get("/userRoom", (req, res) => {
  var SELECT_TUTOR_INFO_QUERY = `select * from tutor, enroll_tutor where enroll_tutor.user_email='${req.session.user_email}' and enroll_tutor.tutor_id=tutor.tutor_id;`;
  var SELECT_SONG_INFO_QUERY = `select * from song, enroll_song where enroll_song.user_email='${req.session.user_email}' and enroll_song.song_id=song.song_id;`;
  connection.query(SELECT_TUTOR_INFO_QUERY, (err, tutors_list) => {
    connection.query(SELECT_SONG_INFO_QUERY, (err2, songs_list) => {
      res.render("userRoom", {
        login_state: req.session.logined,
        user_name: req.session.user_name,
        tutor_information: tutors_list,
        song_information: songs_list
      });
    });
  });
});

app.get("/community", (req, res) => {
  const SELECT_POST_THUMBNAIL_QUERY = `SELECT post_id,title,description,user_name FROM posting LEFT JOIN user ON posting.user_email = user.user_email;`;
  connection.query(SELECT_POST_THUMBNAIL_QUERY, (err, results) => {
    if (err) {
      return res.send(err);
    } else {
      res.render("community", {
        login_state: req.session.logined,
        user_name: req.session.user_name,
        posting: results
      });
    }
  });
});

app.get("/post-page", (req, res) => {
  res.render("post-page", {
    login_state: req.session.logined,
    user_name: req.session.user_name
  });
});

app.get("/posting", (req, res) => {
  const pid = req.query.post_id;
  var SELECT_POSTING_QUERY = `SELECT post_id,title,description,posting.user_email,user_name,video_path FROM posting LEFT JOIN user ON posting.user_email = user.user_email WHERE post_id=${pid};`;
  connection.query(SELECT_POSTING_QUERY, (err, result) => {
    console.log(result)
    if (err) {
      return res.send(err);
    } else {
      res.render("posting", {
        login_state: req.session.logined,
        user_email: req.session.user_email,
        user_name: req.session.user_name,
        post: result
      })
    }
  })
});

app.post("/upload", (req, res) => {
  console.log(req);
  var INSERT_POST_QUERY = `INSERT INTO posting (user_email, title, description, video_path) VALUES ('${req.session.user_email}','${req.body.title}','${req.body.description}','${req.body.video_path}');`;

  connection.query(INSERT_POST_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      return res.status(200).end();
    }
  });
});

app.get("/modify-page", (req, res) => {
  var pid = req.query.post_id;
  var SELECT_ONPOST_QUERY = `SELECT * from posting WHERE post_id=${pid};`;
  connection.query(SELECT_ONPOST_QUERY, (err, result) => {
    if (err) {
      res.send(err);
    } else {
      console.log(result);
      res.render("modify-page", {
        login_state: req.session.logined,
        user_name: req.session.user_name,
        post: result
      });
    }
  });
});

app.post("/update", (req, res) => {
  var pid = req.query.post_id;
  var UPDATE_ONPOST_QUERY = `UPDATE posting SET title='${req.body.title}',description='${req.body.description}',video_path='${req.body.video_path}' WHERE post_id=${pid};`;
  connection.query(UPDATE_ONPOST_QUERY, (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.status(200).end();
    }
  })
});

app.post("/destroy", (req, res) => {
  var pid = req.query.post_id;
  var DESTROY_ONPOST_QUERY = `DELETE FROM posting WHERE post_id=${pid}`;
  connection.query(DESTROY_ONPOST_QUERY, (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.status(200).end();
    }
  })
})

app.get("/lecture-playing", (req, res) => {
  res.render("lecture-playing", {
    login_state: req.session.logined,
    user_name: req.session.user_name
  });
});

app.get("/lectures/add", (req, res) => {
  const { tid, video_path } = req.query;
  const INSERT_LECTURES_QUERY = `INSERT INTO lecture_videos (tid, video_path) VALUES(${tid}, '${video_path}')`;
  connection.query(INSERT_LECTURES_QUERY, (err, results) => {
    if (err) {
      return res.send(err);
    } else {
      return res.send("successfully added lecture");
    }
  });
});

app.get("/lectures", (req, res) => {
  const SELECET_ALL_PRODUCTS_QUERY = "SELECT * FROM lecture_videos";
  connection.query(SELECET_ALL_PRODUCTS_QUERY, (err, results) => {
    if (err) {
      return res.send(err);
    } else {
      return res.json({
        data: results
      });
    }
  });
});

// https
//   .createServer(
//     {
//       key: fs.readFileSync(
//         "/etc/letsencrypt/live/pianotutoring.econovation.kr/privkey.pem"
//       ),
//       cert: fs.readFileSync(
//         "/etc/letsencrypt/live/pianotutoring.econovation.kr/fullchain.pem"
//       ),
//       ca: fs.readFileSync(
//         "/etc/letsencrypt/live/pianotutoring.econovation.kr/fullchain.pem"
//       )
//     },
//     app
//   )
//   .listen(4000, () => {
//     console.log(`Young's server listening on port 4000`);
//   });


// Socket.io ======================================================================

const http = require("http").createServer(app)

http.listen(4000, () => {
  require("./controllers/socket.js")(http);
  console.log(`Young's server listening on port 4000`);
})

// http.listen(4000, () => {
// });
