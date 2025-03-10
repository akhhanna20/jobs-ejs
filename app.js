const express = require('express');
require('express-async-errors');
const app = express();
const helmet = require('helmet');
const xssClean = require('xss-clean');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const passport = require('passport');
const cookieParser = require('cookie-parser');
const csrf = require('host-csrf');

app.use(helmet());
app.use(xssClean());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

app.use(limiter);

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV == 'test') {
  mongoURL = process.env.MONGO_URI_TEST;
}

const store = new MongoDBStore({
  uri: mongoURL,
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

app.set('view engine', 'ejs');

const passportInit = require('./passport/passportInit');

passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.urlencoded({ extended: true }));

app.use(
  csrf({
    secret: process.env.SESSION_SECRET, // Use the same secret as the session
  }),
);

app.use(require('connect-flash')());

app.use(require('./middleware/storeLocals'));
app.get('/', (req, res) => {
  res.render('index');
});
app.use('/sessions', require('./routes/sessionRoutes'));

app.use((req, res, next) => {
  if (req.path == '/multiply') {
    res.set('Content-Type', 'application/json');
  } else {
    res.set('Content-Type', 'text/html');
  }
  next();
});

app.get('/multiply', (req, res) => {
  let result = req.query.first * req.query.second;
  if (isNaN(result)) {
    result = 'NaN';
  } else if (result == null) {
    result = 'null';
  }
  res.json({ result: result });
});

const secretWordRouter = require('./routes/secretWord');
const auth = require('./middleware/auth');
app.use('/secretWord', auth, secretWordRouter);

const jobsRoutes = require('./routes/jobs');
app.use('/jobs', auth, jobsRoutes);

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
    await require('./db/connect')(mongoURL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`),
    );
  } catch (error) {
    console.log(error);
  }
};

start();

module.exports = { app };
