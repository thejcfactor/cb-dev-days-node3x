const express = require("express");
const router = express.Router();
const verifyToken = require("library/verifyToken");
const { Response } = require("library/response");
const userService = require("service/userService");
const db = require("repository/repository");

/**
 * @swagger
 *
 * /test/ping:
 *   get:
 *     tags:
 *       - Test
 *     name: ping
 *     description: Uses the SDK's health check API to return status of ping() result to db.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: status of specified services
 */
router.get("/ping", ping);

/**
 * @swagger
 *
 * /test/authorizedPing:
 *   get:
 *     tags:
 *       - Test
 *     name: authorizedPing
 *     description: Verify JWT is working successfully.  Uses the SDK's health check API to return status of ping() result to db.
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success
 *       401:
 *         description: unauthorized user
 */
router.get("/authorizedPing", verifyToken, authorizedPing);

/**
 * @swagger
 *
 * /test/testLogin:
 *   get:
 *     tags:
 *       - Test
 *     name: testLogin
 *     description: Endpoint to test login and obtain JWT auth token.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: username
 *         description:  Username for login
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: password
 *         description:  Password for login
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: success
 */
router.get("/testLogin", testLogin);

module.exports = router;

async function ping(req, res) {
  try {

    let response = new Response(null, "Operation not built yet.", null, null);
    let resp = await db.ping();

    if (resp.error) {
      response.message = "Error trying to ping database.";
      response.error = resp.error;
      return res.status(500).send(response);
    }
    
    if(resp == "NOP"){
      return res.status(200).send(response);
    }

    response.data = resp.result;
    response.message = "Successfully pinged database.";
    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      data: null,
      message: "Error attempting to ping database.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
    });
  }
}

async function authorizedPing(req, res) {
  try {
    
    if (!req.jwt.token) {
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    let response = new Response(null, "Operation not built yet.", null, null);
    let resp = await db.ping();
    
    if (resp.error) {
      response.message = "Error trying to ping database.";
      response.error = err;
      return res.status(500).send(response);
    }
    
    if(resp == "NOP"){
      return res.status(200).send(response);
    }

    response.data = resp.result;
    response.message = "Successfully pinged database.";
    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      data: null,
      message: "Error attempting to ping database.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
    });
  }
}

async function testLogin(req, res) {
  try {
    if (!(req.query.username && req.query.password)) {
      return res.status(500).send({
        data: null,
        message: "No username and/or password provided.",
        error: err,
        authorized: null,
      });
    }

    let request = {
      username: req.query.username,
      pw: req.query.password,
    };

    let response = await userService.login(request);

    if (response.error) {
      return res.status(500).send(response);
    }

    if (response.data && response.authorized) {
      return res.status(200).send(response);
    }

    res.status(401).send(response);
  } catch (err) {
    res.status(500).send({
      data: null,
      message: "Error attempting to login user.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
    });
  }
}
