"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");
const express = require("express");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const Job = require("../models/job");  // Import Job model
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs }
 *   where jobs is [ jobId, jobId, ... ]
 *
 * Authorization required: admin or correct user
 **/

router.get("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    const jobs = await User.getJobs(req.params.username);  // Fetch jobs the user has applied for
    user.jobs = jobs;
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** POST /users/:username/jobs/:id => { applied: jobId }
 *
 * Allows a user to apply for a job or admin to do it on behalf of the user.
 *
 * Authorization required: admin or correct user
 **/

router.post("/:username/jobs/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    await User.applyForJob(req.params.username, req.params.id);
    return res.json({ applied: req.params.id });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: admin or correct user
 **/

router.patch("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or correct user
 **/

router.delete("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
