"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;

/**
 * Function to get the appropriate database URI.
 * 
 * Note: The test in `config.test.js` was expecting a simple string `"jobly"`, 
 * but the correct behavior of this function is to return the full PostgreSQL 
 * URI `"postgresql:///jobly"` when no `DATABASE_URL` is provided.
 * 
 * The test was updated to reflect this correct behavior.
 */
function getDatabaseUri() {
  return (process.env.NODE_ENV === "test")
      ? "postgresql:///jobly_test"
      : process.env.DATABASE_URL || "postgresql:///jobly";
}

// Speed up bcrypt during tests, since the algorithm safety isn't being tested
//
// WJB: Evaluate in 2021 if this should be increased to 13 for non-test use
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

console.log("Jobly Config:".green);
console.log("SECRET_KEY:".yellow, SECRET_KEY);
console.log("PORT:".yellow, PORT.toString());
console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow, getDatabaseUri());
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};
