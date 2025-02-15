const express = require('express');
require('express-async-errors');
require('dotenv').config(); // to load the .env file into the process.env object
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const passportInit = require('./passport/passportInit');

const secretWordRouter = require('./routes/secretWord');
const auth = require('./middleware/auth');

const cookieParser = require('cookie-parser');
const csrf = require('host-csrf');

const app = express();

app.set('view engine', 'ejs');
app.use(require('body-parser').urlencoded({ extended: true }));

const url = process.env.MONGO_URI;

const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: 'mySessions',
});
store.on('error', function (error) {
  console.log(error);
});

const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: 'strict' },
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionParms));

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.urlencoded({ extended: false }));

// CSRF protection setup
let csrf_development_mode = true;

if (app.get('env') === 'production') {
  csrf_development_mode = false;
  app.set('trust proxy', 1);
}
const csrf_options = {
  protected_operations: ['PATCH', 'PUT', 'POST', 'DELETE'],
  protected_content_types: [
    'application/json',
    'application/x-www-form-urlencoded',
  ],
  development_mode: csrf_development_mode,
};
const csrf_middleware = csrf(csrf_options); //initialise and return middlware
app.use(csrf_middleware);
// Passport.js initialization for authentication
passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(require('connect-flash')());

app.use(require('./middleware/storeLocals'));

app.get('/', (req, res) => {
  res.render('index');
});

app.use('/sessions', require('./routes/sessionRoutes'));

// Protect the /secretWord route with the auth middleware
app.use('/secretWord', auth, secretWordRouter);

app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
  console.log(err);
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await require('./db/connect')(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`),
    );
  } catch (error) {
    console.log(error);
  }
};

start();
