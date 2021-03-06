const express = require("express");
const router = express.Router();
const userService = require("service/userService");
const verifyToken = require("library/verifyToken");
const outputMessage = require("library/outputMessage");

// routes

/**
 * @swagger
 *
 *
 * definitions:
 *   Response:
 *     type: object
 *     properties:
 *       data:
 *         type: object
 *       message:
 *         type: string
 *       error:
 *         type: object
 *       authorized:
 *         type:  boolean
 *
 *
 */

/**
 * @swagger
 *
 * /user/register:
 *   post:
 *     tags:
 *       - User
 *     summary: Register new user for application
 *     description:  Creates a new user and customer document
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     requestBody:
 *         description:  new user to create
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 password:
 *                   type: string
 *               required:
 *                 - firstName
 *                 - lastName
 *                 - username
 *                 - email
 *                 - password
 *     responses:
 *       200:
 *         description: Successful registration.  Customer and user documents created.
 *         schema:
 *           $ref: '#/definitions/Response'
 *       500:
 *         description: Error trying to create customer and/or user documents.
 *         schema:
 *           $ref: '#/definitions/Response'
 *
 */
router.post("/register", register);

/**
 * @swagger
 *
 * /user/login:
 *   post:
 *     tags:
 *       - User
 *     summary: Login user
 *     description:  Validates username + password.  On success creates session
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     requestBody:
 *         description:  User's login credentials (username + password)
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 password:
 *                   type: string
 *               required:
 *                 - username
 *                 - password
 *     responses:
 *       200:
 *         description: logged in user
 *       401:
 *         description: unauthorized - invalid username and/or password
 */
router.post("/login", login);

/**
 * @swagger
 *
 * /user/verifyUserSession:
 *   get:
 *     tags:
 *       - User
 *     summary: Verifies user session
 *     description:  Verifies user session.  On success extends session
 *     security:
 *       - bearerAuth: []
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     responses:
 *       200:
 *         description: logged in user
 */
router.get("/verifyUserSession", verifyToken, verifyUserSession);

/**
 * @swagger
 *
 * /user/getCustomer:
 *   get:
 *     tags:
 *       - User
 *     name: getCustomer
 *     description: Get a customer document by the customer document key
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: customerId
 *         description: The customerId to lookup customer document type
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer detail
 *       401:
 *         description: unauthorized user
 */
router.get("/getCustomer", verifyToken, getCustomer);

/**
 * @swagger
 *
 * /user/getCustomerOrders:
 *   get:
 *     tags:
 *       - User
 *     name: getCustomerOrders
 *     description: Gets the supplied customer's existing orders
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: customerId
 *         description: The customerId to lookup orders
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: list of orders
 *       401:
 *         description: unauthorized user
 */
router.get("/getCustomerOrders", verifyToken, getCustomerOrders);

/**
 * @swagger
 *
 * /user/getNewOrder:
 *   get:
 *     tags:
 *       - User
 *     name: getNewOrder
 *     description: Get's the logged in customer's new order if it exists
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: customerId
 *         description: The customerId to lookup order
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order detail
 *       401:
 *         description: unauthorized user
 */
router.get("/getNewOrder", verifyToken, getNewOrder);

/**
 * @swagger
 *
 * /user/getOrder:
 *   get:
 *     tags:
 *       - User
 *     name: getOrder
 *     description: Get's the logged in customer's specific order
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: orderId
 *         description: The orderId to lookup order
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order detail
 *       401:
 *         description: unauthorized user
 */
router.get("/getOrder", verifyToken, getOrder);


/**
 * @swagger
 *
 * /user/saveOrUpdateOrder:
 *   post:
 *     tags:
 *       - User
 *     name: saveOrUpdateOrder
 *     description: Saves logged in customer's order or replaces a previously saved order
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     requestBody:
 *         description:  new order to save
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *     responses:
 *       200:
 *         description: Order details
 *       401:
 *         description: unauthorized user
 */
router.post("/saveOrUpdateOrder", verifyToken, saveOrUpdateOrder);

/**
 * @swagger
 *
 * /user/deleteOrder:
 *   delete:
 *     tags:
 *       - User
 *     name: deleteOrder
 *     description: Delete's a logged in customer's specific order
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: orderId
 *         description: The orderId of order document to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order detail
 *       401:
 *         description: unauthorized user
 */
router.delete("/deleteOrder", verifyToken, deleteOrder);


/**
 * @swagger
 *
 * /user/saveOrUpdateAddress:
 *   post:
 *     tags:
 *       - User
 *     name: saveOrUpdateAddress
 *     description: Saves a new address for a logged in customer
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     requestBody:
 *         description:  new address to save
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *     responses:
 *       200:
 *         description: saved address
 *       401:
 *         description: unauthorized user
 */
router.post("/saveOrUpdateAddress", verifyToken, saveOrUpdateAddress);

module.exports = router;

async function register(req, res) {
  //only used for req/response logging in UI
  let reqId = -1;
  try {

    let request = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
    };

    let response = await userService.register(request);
    reqId = req.body.requestId ? parseInt(req.body.requestId) : -1;
    outputMessage(response, "userController.js:register() - response:");
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      data: null,
      message: "Error attempting to register user.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId,
    });
  }
}

async function verifyUserSession(req, res) {
  //only used for req/response logging in UI
  let reqId = -1;
  try {
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    let response = await userService.getUserFromSession(req.jwt);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:verifyUserSession() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      data: null,
      message: "Error trying to verify user session.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId,
    });
  }
}

async function login(req, res) {
  //only used for req/response logging in UI
  let reqId = -1;
  try {
    reqId = req.body.requestId ? parseInt(req.body.requestId) : -1;
    
    if (!(req.body.username && req.body.password)) {
      return res.status(500).send({
        data: null,
        message: "No username and/or password provided.",
        error: null,
        authorized: null,
        requestId: reqId,
      });
    }

    let request = {
      username: req.body.username,
      pw: req.body.password,
    };

    let response = await userService.login(request);

    response.requestId = reqId;
    outputMessage(response, "userController.js:login() - response:");
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
      requestId: reqId
    });
  }
}

async function getCustomer(req, res){
  let reqId = -1;
  try{
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.query.customerId) {
      return res.status(500).send({
        data: null,
        message: "No customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }
  
    const parsedId = parseInt(req.query.customerId);

    if (isNaN(parsedId)) {
      return res.status(500).send({
        data: null,
        message: "Invalid customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let response = await userService.getCustomer(parsedId);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:getCustomer() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    res.status(500).send({
      data: null,
      message: "Error attempting to get customer.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId:  reqId
    });
  }
}

async function getCustomerOrders(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.query.customerId) {
      return res.status(500).send({
        data: null,
        message: "No customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }
  
    const parsedId = parseInt(req.query.customerId);

    if (isNaN(parsedId)) {
      return res.status(500).send({
        data: null,
        message: "Invalid customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let response = await userService.getCustomerOrders(parsedId);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:getCustomerOrders() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    res.status(500).send({
      data: null,
      message: "Error attempting to get customer orders.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}

async function getNewOrder(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.query.customerId) {
      return res.status(500).send({
        data: null,
        message: "No customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }
  
    const parsedId = parseInt(req.query.customerId);

    if (isNaN(parsedId)) {
      return res.status(500).send({
        data: null,
        message: "Invalid customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let response = await userService.getNewOrder(parsedId);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:getNewOrder() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    res.status(500).send({
      data: null,
      message: "Error attempting to get customer new/pending orders.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}

async function getOrder(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.query.orderId) {
      return res.status(500).send({
        data: null,
        message: "No orderId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let response = await userService.getOrder(req.query.orderId);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:getOrder() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    res.status(500).send({
      data: null,
      message: "Error attempting to get customer order.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}

async function saveOrUpdateOrder(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.body.requestId ? parseInt(req.body.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.body.order) {
      return res.status(500).send({
        data: null,
        message: "No order provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let request = {
      order: req.body.order,
      update: req.body.update ? req.body.update : false
    };

    let response = await userService.saveOrUpdateOrder(request);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:saveOrUpdateOrder() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    let msg = "Error occurred trying to save/update customer order.";
    if (req.body && req.body.update) {
      msg =
        "Error attempting to " +
        (req.update ? "update" : "save new") +
        " order.";
    }
    res.status(500).send({
      data: null,
      message: msg,
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}

async function deleteOrder(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.query.requestId ? parseInt(req.query.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.query.orderId) {
      return res.status(500).send({
        data: null,
        message: "No orderId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let response = await userService.deleteOrder(req.query.orderId);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:deleteOrder() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    res.status(500).send({
      data: null,
      message: "Error attempting to delete customer order.",
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}

async function saveOrUpdateAddress(req, res){
  //only used for req/response logging in UI
  let reqId = -1;
  try{
    reqId = req.body.requestId ? parseInt(req.body.requestId) : -1;
    if (!req.jwt.token) {
      req.jwt.sessionRes.requestId = reqId;
      if (req.jwt.sessionRes.authorized != null && !req.jwt.sessionRes.authorized) {
        return res.status(401).send(req.jwt.sessionRes);
      }
      return res.status(500).send(req.jwt.sessionRes);
    }

    if (!req.body.customerId) {
      return res.status(500).send({
        data: null,
        message: "No customerId provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    if (!req.body.address) {
      return res.status(500).send({
        data: null,
        message: "No address provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    if (!req.body.path) {
      return res.status(500).send({
        data: null,
        message: "No document path provided.",
        error: null,
        authorized: true,
        requestId: reqId
      });
    }

    let request = {
      custId: req.body.customerId,
      address: req.body.address,
      path: req.body.path,
      update: req.body.update ? req.body.update : false
    };

    let response = await userService.saveOrUpdateAddress(request);
    response.requestId = reqId;
    outputMessage(
      response,
      "userController.js:saveOrUpdateAddress() - response:"
    );
    if (response.error) {
      return res.status(500).send(response);
    }

    res.status(200).send(response);
  }catch(err){
    let msg = "Error occurred trying to save/update customer address.";
    if (req.body && req.body.update) {
      msg =
        "Error attempting to " +
        (req.update ? "update" : "save new") +
        " address.";
    }
    res.status(500).send({
      data: null,
      message: msg,
      error: { message: err.message, stackTrace: err.stack },
      authorized: null,
      requestId: reqId
    });
  }
}
