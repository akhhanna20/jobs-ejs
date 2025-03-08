const express = require('express');
const router = express.Router();

const {
  getAllJobs,
  createJob,
  newJob,
  editJob,
  updateJob,
  deleteJob,
} = require('../controllers/jobs');

router.get('/', getAllJobs); //display all the product listings belonging to this user
router.post('/', createJob); //Add a new product listing
router.get('/new', newJob); //put up the form to create a new entry
router.get('/edit/:id', editJob); //get a particulat entry and show it in the edit box
router.post('/update/:id', updateJob); //update a particular entry
router.post('/delete/:id', deleteJob); //delete an entry

module.exports = router;
