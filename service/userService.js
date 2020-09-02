const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const config = require("configuration/config.js");
const secret = global.configuration.secret;
const ttl = global.configuration.sessionTTL;

//connection made in server.js -> should cache the repository so only 1 instance instantiated (i.e. singleton pattern)
const db = require("repository/repository");

const outputMessage = require("library/outputMessage");
const { Response } = require("library/response");

module.exports = {
  register,
  login,
  extendSession,
  getUserFromSession,
  getCustomer,
  getCustomerOrders,
  getNewOrder,
  getOrder,
  saveOrUpdateOrder,
  deleteOrder,
  saveOrUpdateAddress
};

async function register(userInfo) {
  userInfo.password = await bcrypt.hash(userInfo.password, 10);
  let response = new Response(null, "Operation not built yet.", null, null);
  let acct = await db.createAccount(userInfo);
  outputMessage(acct, "userService.js:register() - acct:");
  if (acct.result) {
    if (acct.result == "NOP") {
      return response;
    }
    response.data = acct.result;
    response.message = "Successfully registered customer/user.";
  } else {
    response.message = "Error registering customer/user.";
    response.error = acct.error;
  }
  return response;
}

async function login(req) {
  let validUserRes = await verifyUser(req.username, req.pw, null);

  if (validUserRes.error || validUserRes.message.includes("Operation not")) {
    return validUserRes;
  }
  let response = new Response(null, "Operation not built yet.", null, null);

  if (!validUserRes.data) {
    response.message = "Invalid user.  Check username and password.";
    response.authorized = false;
    return response;
  }

  let key = `customer_${validUserRes.data.custId}`;
  let customerInfo = await db.getObjectByKey(key);
  if (!customerInfo.result) {
    response.message = "Invalid user.  Check username";
    response.authorized = false;
    response.error = customerInfo.error;
    return response;
  }

  let sessionRes = await createSession(req.username);
  if (sessionRes.error) {
    return sessionRes;
  }

  let token = jwt.sign({ id: sessionRes.data.sessionId }, secret);
  response.data = {
    userInfo: {
      userId: validUserRes.data.userId,
      username: validUserRes.data.username,
      token: token,
    },
    customerInfo: customerInfo.result,
  };
  response.message = "Successfully logged in (session created).";
  response.authorized = true;

  return response;
}

async function getUserFromSession(jwt) {
  let validUserRes = await verifyUser(jwt.sessionRes.data.username, null, true);

  if (validUserRes.error || validUserRes.message.includes("Operation not")) {
    return validUserRes;
  }
  let response = new Response(null, "Operation not built yet.", null, null);

  if (!validUserRes.data) {
    response.message = "Invalid user.  Check username and password.";
    response.authorized = false;
    return response;
  }

  let key = `customer_${validUserRes.data.custId}`;
  let customerInfo = await db.getObjectByKey(key);
  if (!customerInfo.result) {
    response.message = "Invalid user.  Check username";
    response.authorized = false;
    response.error = customerInfo.error;
    return response;
  }

  response.data = {
    userInfo: {
      userId: validUserRes.data.userId,
      username: validUserRes.data.username,
      token: jwt.token,
    },
    customerInfo: customerInfo.result
  };
  response.message = "Successfully verified and extended session.";
  response.authorized = true;

  return response;
}

async function extendSession(token) {
  let response = new Response(null, "Operation not built yet.", null, null);
  let decoded = null;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    print(err);
    response.message = "Error extending session.  Invalid token";
    response.error = { message: err.message, stackTrace: err.stack };
    return response;
  }
  let session = await db.extendSession(decoded.id, ttl);

  if (session.error) {
    /*
    TODO:  need to see how 3.x has changed error codes
    if (session.error.code == 13) {
      response.message = "Unauthorized.  Session expired.";
      response.authorized = false;
    }else{
      response.message = "Error trying to verify session.";
    }*/
    //TODO:  do not assume all errors will be key not found
    response.message = "Unauthorized.  Session expired.";
    response.authorized = false;
    response.error = session.error;
    return response;
  }

  if (session.session == "NOP") {
    return response;
  }

  response.data = session.session;
  response.message = "Successfully extended session.";
  response.authorized = true;

  return response;
}

async function getCustomer(id) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let docId = `customer_${id}`;
  let result = await db.getCustomer(docId);

  if (result.error) {
    response.error = result.error;
    response.message = "Error retrieving customer.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.customer;
  response.message = "Successfully retrieved customer.";
  return response;
}

async function getCustomerOrders(id) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.getOrders(id);

  if (result.error) {
    response.error = result.error;
    response.message = "Error retrieving orders.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.orders;
  response.message = "Successfully retrieved orders.";
  return response;
}

async function getNewOrder(id) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.getNewOrder(id);

  if (result.error) {
    response.error = result.error;
    response.message = "Error retrieving new/pending order.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.orders;
  response.message = "Successfully retrieved new/pending order.";
  return response;
}

async function getOrder(id) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.getOrder(id);

  if (result.error) {
    response.error = result.error;
    response.message = "Error retrieving order.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.order;
  response.message = "Successfully retrieved order.";
  return response;
}

async function saveOrUpdateOrder(req) {
  return (await req.update) ? updateOrder(req.order) : saveOrder(req.order);
}

async function deleteOrder(id) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.deleteOrder(id);

  if (result.error) {
    response.error = result.error;
    response.message = "Error deleting order.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.success;
  response.message = "Successfully deleted order.";
  return response;
}

async function saveOrUpdateAddress(req) {
  outputMessage(req, "userService.js:saveOrUpdateAddress() - req:");

  //If updating address, path should be:  address.<name of address to update>
  //      EX.  address.home
  //If saving address, path should be:  address.  Since this is the root path to all addresses for the customer doc type
  return await req.update ? updateAddress(req) : saveAddress(req);
}

/*
 * Private/Helper methods 
 * 
 */

async function verifyUser(username, password, jwt) {
  let result = await db.getUserInfo(username, false);
  let response = new Response(null, "Operation not built yet.", null, null);
  if (result.error) {
    response.error = result.error;
    response.message = "Could not find user.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  if (jwt) {
    response.data = result.userInfo;
    response.message = "JWT - no password verification needed.";
    return response;
  }

  console.log(result);

  let passwordIsValid = await bcrypt.compare(
    password,
    result.userInfo.password
  );

  if (passwordIsValid) {
    response.data = result.userInfo;
    response.message = "Password verified.";
  }else{
    response.message = "Invalid password.";
  }

  return response;
}

async function createSession(username) {
  let response = new Response(null, "Operation not built yet.", null, null);
  let session = await db.createSession(username, ttl);
  if (session.error) {
    response.message = "Error creating session.";
    response.error = session.error;
    return response;
  }

  outputMessage(session.session, "userService.js:createSession() - session:");
  //NOP is to take into account potential lab for creating user session
  if (session.session !== "NOP") {
    response.data = session.session;
    response.message = "Session created.";
  }

  return response;
}

async function saveOrder(order) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.saveOrder(order);

  if (result.error) {
    response.error = result.error;
    response.message = "Error saving order.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.order;
  response.message = "Successfully saved order.";
  return response;
}

async function updateOrder(order) {
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.replaceOrder(order);

  if (result.error) {
    response.error = result.error;
    response.message = "Error updating order.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.success;
  response.message = "Successfully updated order.";
  return response;
}

async function saveAddress(req){
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.saveAddress(req.custId, req.path, req.address);

  if (result.error) {
    response.error = result.error;
    response.message = "Error saving address.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.success;
  response.message = "Successfully saved address.";
  return response;
}

async function updateAddress(req){
  let response = new Response(null, "Operation not built yet.", null, true);
  let result = await db.updateAddress(req.custId, req.path, req.address);

  if (result.error) {
    response.error = result.error;
    response.message = "Error updating address.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.success;
  response.message = "Successfully updated address.";
  return response;
}


