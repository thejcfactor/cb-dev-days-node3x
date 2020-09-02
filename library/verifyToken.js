const userService = require("service/userService");
const outputMessage = require("library/outputMessage");
const { Response } = require("library/response");

module.exports = verifyToken;

async function verifyToken(req, res, next) {
  let bearerHeader = req.headers["authorization"];
  let response = new Response(null, null, null, null);

  if(!bearerHeader){
    response.message = "No authorization token provided.";
    response.authorized = false;
    req.jwt = {
      token: null,
      sessionRes: response
    };
    return next();
  }

  let token = null;
  try {
    token = bearerHeader.replace("Bearer ", "");
    let extSessionRes = await userService.extendSession(token);
    req.jwt = {
      token: extSessionRes.error ? null : token,
      sessionRes: extSessionRes
    };
  } catch (err) {
    response.error = err;
    response.message = "Failed to extend session.";
    req.jwt = {
      token: null,
      sessionRes: response
    };
  }
  next();
}
