const express = require('express');
require('express-async-errors');
require('dotenv').config(); // to load the .env file into the process.env object
const session = require('express-session');
const flash = require('connect-flash');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const passportInit = require('./passport/passportInit');

const secretWordRouter = require('./routes/secretWord');
const auth = require('./middleware/auth');

const cookieParser = require('cookie-parser');
const csrf = require('host-csrf');

const jobsRouter = require('./routes/jobs');

const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimiter = require('express-rate-limit');

const path = require('path');

const app = express();

// Security middlewares
app.use(helmet());
app.use(xss());
// Rate limiting
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  }),
);

app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.use(require('body-parser').urlencoded({ extended: true }));

const url = process.env.MONGO_URI;

const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: 'mySessions',
});

// Handle MongoDB session store errors
store.on('error', function (error) {
  console.error(error);
});

// Session setup and configuration
const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: 'strict' },
};

// Enable secure cookies on production
if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}

// Session middleware
app.use(session(sessionParms));

// Flash middleware
app.use(flash());

// Passport.js initialization for authentication
passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(require('./middleware/storeLocals'));

// Cookie parser
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

// CSRF middleware
app.use((req, res, next) => {
  let token = csrf.token(req, res);
  res.locals._csrf = token;
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  next();
});

app.get('/', (req, res) => {
  res.render('index');
});

app.use('/sessions', require('./routes/sessionRoutes'));

// Protect the /secretWord route with the auth middleware
app.use('/secretWord', auth, secretWordRouter);

// Protect the /jobs route with the auth middleware
app.use('/jobs', auth, jobsRouter);

// Handle CSRF errors
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF error:', err);
    req.flash('error', 'Invalid CSRF token.');

    if (res.headersSent) {
      return next(err);
    } else {
      return res.redirect('back');
    }
  } else {
    next(err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});
// 500 handler
app.use((err, req, res) => {
  res.status(500).send(err.message);
});

// Start server
const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await require('./db/connect')(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`),
    );
  } catch (error) {
    console.error(error);
  }
};

start();
