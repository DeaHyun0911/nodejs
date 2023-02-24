const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const multer = require('multer');
const storage = multer.diskStorage({
  destination : function(req, file, cb) {
    cb(null, './public/image')
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname)
  }
}) ;

const upload = multer({storage: storage});

require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({ secret: 'secretcode', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');

var db;
MongoClient.connect(process.env.DB_URL,
  function (error, client) {
    if (error) return console.log('에러')
    db = client.db('todoapp');
    app.listen(process.env.PORT, function () {
      console.log('listening on 0911')
    });
  });

app.use(express.static('public'));

app.get('/', function (req, res) {
  // 모든 데이터 가져오기
  db.collection('post').find().toArray(function (err, req) {
    res.render('index.ejs', { posts: req });
  });
});




app.get('/login', function (req, res) {
  res.render('login.ejs')
});

app.get('/register', function (req, res) {
  res.render('register.ejs')
});


app.get('/mypage', didYouLogin, function (req, res) {
  console.log(req);
  res.render('mypage.ejs', { 사용자: req.user })
});

app.get('/upload', function(req, res) {
  res.render('upload.ejs')
})

// 미들웨어 - 로그인 확인 여부
function didYouLogin(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.send('Not Login')
  }
}


// 검색 기능 구현
app.get('/search', function (req, res) {
  const searchCon = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: '제목'
        }
      }
    },
    // 아이디로 정렬
    { $sort : { _id: 1 } },
    // 정확도
    { $project : { 제목: 1, _id: 0, score: { $meta: "searchScore" } } }
  ]
  db.collection('post').aggregate(searchCon).toArray((err, out)=> {
    console.log(out)
    res.render('search.ejs', { posts: out })
  })
})




app.get('/edit/:id', function (req, res) {
  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (err, out) {
    res.render('edit.ejs', { post: out })
    console.log(out)
  })
})

app.get('/detail/:id', function (req, res) {

  db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (err, out) {
    if (err) throw err;
    res.render('detail.ejs', { data: out, user: req.user });
  })
})


app.put('/edit', function (req, res) {
  db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set: { 제목: req.body.title, 날짜: req.body.date } }, function (err, out) {
    console.log('수정완료');
    res.redirect('/list')
  })
})



app.post('/login', passport.authenticate('local', {
  failureRedirect: '/fail'
}), function (req, res) {
  res.redirect('/')
});

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('user').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    // done(서버에러, 성공시 사용자DB데이터, 에러메세지)
    if (에러) return done(에러)
    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

// id로 세션 저장
passport.serializeUser(function (user, done) {
  done(null, user.id)
});


passport.deserializeUser(function (아이디, done) {
  db.collection('user').findOne({ id: 아이디 }, function (err, out) {
    done(null, out)
  })
});

app.post('/register', function(req, res){
  db.collection('user').insertOne( { id: req.body.id, pw: req.body.pw } , function(err, out){
    res.redirect('/')
  })
})

app.post('/add', function (요청, 응답) {
  db.collection('counter').findOne({ name: 'postLength' }, function (에러, 결과) {
    var 총게시물갯수 = 결과.totalPost
    var savedata = { _id: 총게시물갯수 + 1, 제목: 요청.body.title, 날짜: 요청.body.date, 내용: 요청.body.content, 작성자: 요청.user._id }
    db.collection('post').insertOne(savedata, function (에러, 결과) {
      db.collection('counter').updateOne({ name: 'postLength' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
        if (에러) { return console.log(에러) }
        응답.redirect('/')
      })
    })

  })
})



app.post('/upload', upload.single('profile'), function(req, res){
  res.send('업로드완료')
})

app.delete('/delete', function (req, res) {
  console.log(req.body)
  req.body._id = parseInt(req.body._id);

  const deleteData = { _id: req.body._id, 작성자: req.user._id }

  db.collection('post').deleteOne(deleteData, function (에러, 결과) {
    console.log('삭제완료');
    if (에러) {console.log(에러)}
    res.status(200).send({ message: '성공했습니다' });
  })
})


app.use('/', require('./routes/member.js'));