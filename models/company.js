"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */
  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies, with optional filtering by name, minEmployees, and maxEmployees.
   *
   * @param {Object} filters - Optional filtering criteria.
   * @param {string} filters.name - Filter by company name (case-insensitive, partial match).
   * @param {number} filters.minEmployees - Filter by minimum number of employees.
   * @param {number} filters.maxEmployees - Filter by maximum number of employees.
   * 
   * @returns {Array} Array of companies matching the criteria.
   * @throws {BadRequestError} If minEmployees is greater than maxEmployees.
   * */
  static async findAll({ name, minEmployees, maxEmployees } = {}) {
    let query = `SELECT handle,
                        name,
                        description,
                        num_employees AS "numEmployees",
                        logo_url AS "logoUrl"
                 FROM companies`;
    let whereExpressions = [];
    let queryValues = [];

    // If a name is provided, add it to the filtering criteria
    if (name) {
      queryValues.push(`%${name}%`);
      whereExpressions.push(`name ILIKE $${queryValues.length}`);
    }

    // If minEmployees is provided, add it to the filtering criteria
    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);
      whereExpressions.push(`num_employees >= $${queryValues.length}`);
    }

    // If maxEmployees is provided, add it to the filtering criteria
    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereExpressions.push(`num_employees <= $${queryValues.length}`);
    }

    // Check for the invalid condition where minEmployees is greater than maxEmployees
    if (minEmployees !== undefined && maxEmployees !== undefined && minEmployees > maxEmployees) {
      throw new BadRequestError("Min employees cannot be greater than max employees");
    }

    // If we have any WHERE clauses, join them to the query
    if (whereExpressions.length > 0) {
      query += " WHERE " + whereExpressions.join(" AND ");
    }

    // Finalize the query with an ORDER BY clause
    query += " ORDER BY name";
    const companiesRes = await db.query(query, queryValues);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company, including associated jobs.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   **/
  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobsRes = await db.query(
      `SELECT id, title, salary, equity
       FROM jobs
       WHERE company_handle = $1`,
      [handle]
    );

    company.jobs = jobsRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */
  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/
  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
