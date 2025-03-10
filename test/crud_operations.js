const { app } = require('../app');
const Job = require('../models/Job');
const { seed_db, testUserPassword } = require('../util/seed_db');
const get_chai = require('../util/get_chai');
const { factory } = require('../util/seed_db');

describe('Testing Job CRUD Operations', function () {
  let csrfToken, csrfCookie, sessionCookie, testUser;

  before(async () => {
    const { expect, request } = await get_chai();
    testUser = await seed_db();

    let res = await request(app).get('/sessions/logon').send();
    const textNoLineEnd = res.text.replace(/\n/g, '');
    csrfToken = /_csrf\" value=\"(.*?)\"/.exec(textNoLineEnd)[1];

    let cookies = res.headers['set-cookie'];
    csrfCookie = cookies.find((element) => element.startsWith('csrfToken'));

    const loginData = {
      email: testUser.email,
      password: testUserPassword,
      _csrf: csrfToken,
    };

    res = await request(app)
      .post('/sessions/logon')
      .set('Cookie', csrfCookie)
      .set('content-type', 'application/x-www-form-urlencoded')
      .redirects(0)
      .send(loginData);

    cookies = res.headers['set-cookie'];
    sessionCookie = cookies.find((element) =>
      element.startsWith('connect.sid'),
    );

    expect(csrfToken).to.not.be.undefined;
    expect(sessionCookie).to.not.be.undefined;
    expect(csrfCookie).to.not.be.undefined;
  });

  it('should fetch the list of jobs and verify there are 20 entries', async () => {
    const { expect, request } = await get_chai();

    const res = await request(app)
      .get('/jobs')
      .set('Cookie', sessionCookie)
      .send();

    expect(res).to.have.status(200);

    const pageParts = res.text.split('<tr>');
    expect(pageParts.length).to.equal(21); // Ensure there are 21 rows (including header)
  });

  it('should add a new job and verify the database now has 21 jobs', async () => {
    const { expect, request } = await get_chai();

    const newJob = await factory.create('job', {
      createdBy: testUser._id,
      position: 'Software Developer',
      company: 'Tech Corp',
    });

    const jobData = {
      position: newJob.position,
      company: newJob.company,
      _csrf: csrfToken,
    };

    const initialJobCount = await Job.countDocuments({
      createdBy: testUser._id,
    });
    console.log('Initial job count:', initialJobCount);

    const res = await request(app)
      .post('/jobs')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('content-type', 'application/x-www-form-urlencoded')
      .send(jobData);

    const jobs = await Job.find({ createdBy: testUser._id });
    expect(jobs.length).to.equal(21); // Verify that there are 21 jobs now
  });
});
