const puppeteer = require('puppeteer');
require('../app');
const { seed_db, testUserPassword } = require('../util/seed_db');
const Job = require('../models/Job');

let testUser = null;
let page = null;
let browser = null;

describe('jobs-ejs Puppeteer Test', function () {
  before(async function () {
    this.timeout(30000);
    console.log('Launching browser...');
    browser = await puppeteer.launch({ headless: false, slowMo: 100 });

    console.log('Opening new page...');
    page = await browser.newPage();

    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('Page loaded successfully.');
  });

  after(async function () {
    this.timeout(5000);
    await browser.close();
  });

  describe('Logon Process', function () {
    this.timeout(20000);

    it('logs in successfully', async () => {
      const { expect } = await import('chai');
      testUser = await seed_db();

      await page.goto('http://localhost:3000/sessions/logon', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
      await page.waitForSelector('input[name="email"]', { visible: true });
      await page.type('input[name="email"]', testUser.email);
      await page.type('input[name="password"]', testUserPassword);

      await page.waitForSelector('button[type="submit"]', { visible: true });
      await page.click();
      await page.waitForNavigation();

      //------
      const buttonExists = await page.$('button[type="submit"]');
      if (!buttonExists) {
        console.log('Submit button not found on the page');
      }
      //------
      const loggedInText = await page.evaluate(() =>
        document.body.innerText.includes(`${testUser.name} is logged on.`),
      );
      expect(loggedInText).to.be.true;
    });
  });

  describe('Puppeteer Job Operations', function () {
    this.timeout(30000);

    it('verifies initial job count', async () => {
      const { expect } = await import('chai');
      await page.goto('http://localhost:3000/jobs', {
        waitUntil: 'networkidle2',
      });

      const jobCount = await page.evaluate(async () => {
        return document.querySelectorAll('tr').length;
      });
      expect(jobCount).to.equal(21);
    });

    it('adds a new job', async () => {
      const { expect } = await import('chai');
      await page.goto('http://localhost:3000/jobs/new');

      await page.waitForSelector('input[name="position"]');
      await page.waitForSelector('textarea[name="company"]');

      await page.type('input[name="position"]', 'Test Automation Engineer');
      await page.type(
        'textarea[name="company"]',
        'Testing job automation using Puppeteer.',
      );
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const jobCount = await page.evaluate(
        () => document.querySelectorAll('tr').length,
      );
      expect(jobCount).to.equal(22);
    });

    it('deletes the job', async () => {
      const { expect } = await import('chai');
      await page.goto('http://localhost:3000/jobs', {
        waitUntil: 'networkidle2',
      });

      const initialJobCount = await page.evaluate(
        () => document.querySelectorAll('tr').length,
      );
      // expect(initialJobCount).to.equal(22);
      expect(initialJobCount).to.be.greaterThan(0);

      const deleteButtons = await page.$$('button.delete-job');
      await deleteButtons[deleteButtons.length - 1].click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      const jobCountAfterDelete = await page.evaluate(
        () => document.querySelectorAll('tr').length,
      );
      expect(jobCountAfterDelete).to.equal(21);
    });

    it('verifies the job listings page has 21 entries', async () => {
      const { expect } = await import('chai');

      const jobsLink = await page.waitForSelector('a[href="/jobs"]');
      await jobsLink.click();
      await page.waitForNavigation();

      const pageTitle = await page.title();
      expect(pageTitle.toLowerCase()).to.include('jobs');

      const jobRows = await page.$$eval('tr', (rows) => rows.length);
      expect(jobRows).to.equal(21);
    });

    it("verifies that the 'Add A Job' form loads correctly", async () => {
      const { expect } = await import('chai');

      const addJobButton = await page.waitForSelector('a[href="/jobs/new"]');
      await addJobButton.click();
      await page.waitForNavigation();

      const formTitle = await page.title();
      expect(formTitle.toLowerCase()).to.include('add job');

      const companyField = await page.waitForSelector('input[name="company"]');
      expect(companyField).to.not.be.null;

      const positionField = await page.waitForSelector(
        'input[name="position"]',
      );
      expect(positionField).to.not.be.null;

      const submitButton = await page.waitForSelector('button[type="submit"]');
      expect(submitButton).to.not.be.null;
    });

    it('adds a job and verifies it appears in the job list and database', async () => {
      const { expect } = await import('chai');

      const testJob = {
        company: 'TestCorp',
        position: 'QA Engineer',
      };

      const companyField = await page.waitForSelector('input[name="company"]');
      await companyField.type(testJob.company);

      const positionField = await page.waitForSelector(
        'input[name="position"]',
      );
      await positionField.type(testJob.position);

      const submitButton = await page.waitForSelector('button[type="submit"]');
      await submitButton.click(); // Fixed the issue here
      await page.waitForNavigation();

      const pageContent = await page.content();
      expect(pageContent).to.include('Job listing added successfully');

      const latestJob = await Job.findOne({
        company: testJob.company,
        position: testJob.position,
      });
      expect(latestJob).to.not.be.null;
      expect(latestJob.company).to.equal(testJob.company);
      expect(latestJob.position).to.equal(testJob.position);
    });
  });
});
