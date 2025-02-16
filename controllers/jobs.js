const Job = require('../models/Job');

const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).sort('createdAt');
    res.render('jobs', { jobs });
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error fetching jobs');
    res.redirect('/jobs');
  }
};

const createJob = async (req, res) => {
  try {
    req.body.createdBy = req.user._id.toString();
    const { company, position, status } = req.body;

    if (!company || !position || !status) {
      req.flash('error', 'All fields are required');
      return res.redirect('/jobs/new');
    }

    await Job.create(req.body);

    res.redirect('/jobs');
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error creating job');
    res.redirect('/jobs/new');
  }
};

const newJob = async (req, res) => {
  res.render('job', { job: null });
};

const editJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id.toString();

    const job = await Job.findOne({ _id: jobId, createdBy: userId });

    if (!job) {
      req.flash('error', `No job with id: ${jobId} found`);
      res.redirect('/jobs');
    }
    res.render('job', { job });
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error fetching job');
    res.redirect('/jobs');
  }
};

const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id.toString();
    const { company, position, status } = req.body;

    if (!company || !position || !status) {
      req.flash('error', 'All fields are required');
      res.redirect(`/jobs/edit/${jobId}`);
    }

    const job = await Job.findOneAndUpdate(
      { _id: jobId, createdBy: userId },
      req.body,
      { new: true, runValidators: true },
    );

    if (!job) {
      req.flash('error', `No job with id: ${jobId} found`);
      res.redirect('/jobs');
    }

    res.redirect('/jobs');
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error updating job');
    res.redirect('/jobs/edit/${req.params.id}');
  }
};

const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id.toString();

    const job = await Job.findOneAndDelete({ _id: jobId, createdBy: userId });

    if (!job) {
      req.flash('error', `No job with id: ${jobId} found`);
      res.redirect('/jobs');
    }
    res.redirect('/jobs');
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error deleting job');
    res.redirect('/jobs');
  }
};

module.exports = {
  getAllJobs,
  newJob,
  createJob,
  editJob,
  updateJob,
  deleteJob,
};
