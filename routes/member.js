var router = require('express').Router();

function didYouLogin(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login')
  }
}

router.use(didYouLogin)

router.get('/write', function (req, res) {
  res.render('write')
});


module.exports = router;
