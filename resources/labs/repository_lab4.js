const couchbase = require("couchbase");
const outputMessage = require("library/outputMessage");
const { v4: uuidv4 } = require("uuid");
const config = require("configuration/config.js");


/**
 * Class representing a single instance of a Couchbase client.
 */
class Repository {
  constructor() {
    this.host = "test";
    this.bucketName = "";
    this.username = "";
    this.password = "";

    this.cluster = null;
    this.bucket = null;
    this.collection = null;
    let { host, secure, bucket, username, password } = global.configuration.database;
    this.connect(host, secure, bucket, username, password);
  }

  async connect(host, secure, bucketName, username, password) {
    this.host = secure
      ? `couchbases://${host}?ssl=no_verify`
      : `couchbase://${host}`;
    this.bucketName = bucketName;
    this.username = username;
    this.password = password;
    try {
      const options = { username: this.username, password: this.password };
      this.cluster = new couchbase.Cluster(this.host, options);

      this.bucket = await this.cluster.bucket(this.bucketName);
      this.collection = await this.bucket.defaultCollection();

      /* 
      
      TODO:  this will throw an error when not connected

      (node:48671) UnhandledPromiseRejectionWarning: Error: unexpected error on non-final callback
    at /Users/jaredcasey/GIT/couchbase/demos/cb-dev-days/node-30-api/node_modules/couchbase/lib/httpexecutor.js:70:17
    at Array.<anonymous> (/Users/jaredcasey/GIT/couchbase/demos/cb-dev-days/node-30-api/node_modules/couchbase/lib/connection.js:173:25)
    at Connection._flushPendOps (/Users/jaredcasey/GIT/couchbase/demos/cb-dev-days/node-30-api/node_modules/couchbase/lib/connection.js:142:23)
    at Connection.close (/Users/jaredcasey/GIT/couchbase/demos/cb-dev-days/node-30-api/node_modules/couchbase/lib/connection.js:210:10)
    at /Users/jaredcasey/GIT/couchbase/demos/cb-dev-days/node-30-api/node_modules/couchbase/lib/cluster.js:502:14
(node:48671) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
(node:48671) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
      */
      let connectedBucket = await this.cluster.buckets().getBucket(this.bucketName);
      console.log(connectedBucket);
      if(connectedBucket){
        outputMessage(
          connectedBucket.name,
          "repository.js:connect() - connected to bucket:"
        );
      }else{
        outputMessage(
          "repository.js:connect() - error connecting to bucket."
        );
      }
    } catch (err) {
      outputMessage(
        err,
        "repository.js:connect() - error connecting to bucket."
      );
    }
  }

  async ping(services) {
    try{
      /*
      TODO:  figure out when diagnostics will be available
      let couchbaseServices = [];
      services.forEach((service) => {
        if (service == "KeyValue") {
          couchbaseServices.push(couchbase.ServiceType.KeyValue);
        } else if (service == "Query") {
          couchbaseServices.push(couchbase.ServiceType.Query);
        } else if (service == "Search") {
          couchbaseServices.push(couchbase.ServiceType.Search);
        }
      });*/
      let result = await this.cluster.diagnostics()
      return {diagnostics: result, error: null};
    }catch(err){
      outputMessage(
        err,
        "repository.js:ping() - error trying to retrieve diagnostics."
      );
      return {diagnostics: null, error: err};
    }
  }

  async createAccount(userInfo) {
    try {
      let customerDoc = await this.getNewCustomerDocument(userInfo);

      let savedCustomer = await this.collection.insert(customerDoc._id, customerDoc);

      if (!savedCustomer) {
        return { result: null, error: null };
      }

      let userDoc = await this.getNewUserDocument(userInfo);

      let savedUser = await this.collection.insert(userDoc._id, userDoc);

      if (!savedUser) {
        return { result: null, error: null };
      }

      userDoc.password = null;

      let acct = {
        customerInfo: customerDoc,
        userInfo: userDoc,
      };

      return { result: acct, error: null };
    } catch (err) {
      outputMessage(
        err,
        "repository.js:createAccount() - error creating a new account."
      );
      return { result: null, error: err };
    }
  }

  async getUserInfo(username, adhoc) {
    try {
      let n1qlQuery = `
        SELECT c.custId, u.userId, u.username, u.\`password\`
        FROM \`${this.bucketName}\` u
        JOIN \`${this.bucketName}\` c ON c.username = u.username AND c.doc.type = 'customer'
        WHERE
        u.docType = 'user'
        AND u.username = $1
        LIMIT 1;`;

      let options = {
        parameters: [username]
      };

      //TODO:  prepared queries
      // if (adhoc) {
      //   options.adhoc = true;
      // }

      let qResult = await this.cluster.query(n1qlQuery, options);
      if(!qResult.rows || qResult.rows.length == 0){
        return {userInfo: null, error: null};
      }

      let user = qResult.rows[0];
      return {userInfo: user, error: null};
    } catch (err) {
      outputMessage(
        err,
        "repository.js:getUser() - error retrieving user."
      );
      return { userInfo: null, error: err };
    }
  }

  async createSession(username, expiry) {
    try {
      
      let session = {
        sessionId: uuidv4(),
        username: username,
        docType: "SESSION",
      };

      let sessionKey = `session::${session.sessionId}`;
      let result = await this.collection.insert(sessionKey, session, {expiry: expiry});
      return {session: result ? session : null, error: null};

    } catch (err) {
      outputMessage(
        err,
        "repository.js:createSession() - error creating session."
      );
      return { result: null, error: err };
    }
  }

  async extendSession(sessionId, expiry) {
    try {
      let sessionKey = `session::${sessionId}`;
      let result = await this.collection.getAndTouch(sessionKey, expiry);
      return {session: result ? result.value : null, error: null};
    } catch (err) {
      outputMessage(
        err,
        "repository.js:extendSession() - error extending session."
      );
      return { session: null, error: err };
    }
  }

  async removeSession(sessionId) {
    try {
      let sessionKey = `session::${sessionId}`;
      let kvResult = await this.collection.remove(sessionKey);
      return {result: kvResult ? kvResult : null, error: null};
    } catch (err) {
      outputMessage(
        err,
        "repository.js:removeSession() - error removing session."
      );
      return { result: null, error: err };
    }
  }

  async getCustomer(customerId){
    try{
      /**
       * Lab 1:  K/V operation - Get
       *  1.  Get customer:  bucket.get(key)
       */
      let result = await this.collection.get(customerId);
      console.log(result);
      return { customer: result ? result.value : null, error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:getCustomer() - error:");
      return { session: null, error: err };
    }
  }

  async searchProducts(product, fuzziness){
    try{
      /**
       * Lab 2:  Search operation (FTS)
       *  1.  FTS:
       *        term query w/ fuzziness
       *        use "basic-search" as index name for searchQuery
       *  2.  K/V getMulti() using FTS results
       *
       */      
      let result = await this.cluster.searchQuery(
        "basic-search",
        couchbase.SearchQuery.term(product).fuzziness(fuzziness),
        {
          limit: 500,
        }
      );

      let docIds = result.rows.map((hit) => hit.id);
      //uncomment to see doc count
      // outputMessage(
      //   docIds.length,
      //   "repository.js:searchProducts() - total docs:"
      // );
      let results = await Promise.all(
        docIds.map((id) => {
          return this.collection.get(id);
        })
      );
      return { products: results.map((res) => res.value), error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:searcProducts() - error:");
      return { products: null, error: err };
    }
  }

  async getOrder(orderId){
    try{
      /**
       * Lab 3:  K/V operation(s):
       *  1.  get order:  bucket.get(key)
       *
       */
      let result = await this.collection.get(orderId);
      return { order: result.value ? result.value : null, error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:getOrder() - error:");
      return { order: null, error: err };
    }
  }

  async saveOrder(order){
    try{
      /**
       * Lab 3:  K/V operation(s):
       *  1.  generate key:  order_<orderId>
       *  2.  insert order:  bucket.insert(key, document)
       *  3.  IF successful insert, GET order
       *
       */
      let lastOrderId = await this.getLastOrderId();
      let key = `order_${lastOrderId + 1}`;

      order._id = key;
      order.orderId = lastOrderId + 1;
      order.doc.created = Math.floor(new Date() / 1000);
      order.doc.createdBy = order.custId;

      let savedDoc = await this.collection.insert(key, order);
      if (!savedDoc) {
        return { order: null, error: null };
      }
      let result = await this.collection.get(key);

      return { order: result.value ? result.value : null, error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:saveOrder() - error:");
      return { order: null, error: err };
    }
  }

  async replaceOrder(order){
    try{
      /**
       * Lab 3:  K/V operation(s):
       *  1.  generate key:  order_<orderId>
       *  2.  replace order:  bucket.replace(key, document)
       *
       */
      let key = `order_${order.orderId}`;
      order.doc.modified = Math.floor(new Date() / 1000);
      order.doc.modifiedBy = order.custId;
      let result = await this.collection.replace(key, order);
      return { success: result != null, error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:replaceOrder() - error:");
      return { success: false, error: err };
    }
  }

  async deleteOrder(orderId){
    try{
      /**
       * Lab 3:  K/V operation(s):
       *  1.  delete order:  bucket.remove(key)
       *
       */
      let result = await this.collection.remove(orderId);
      return { success: result != null, error: null };
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:deleteOrder() - error:");
      return { success: false, error: err };
    }
  }

  async getOrders(customerId){
    try{
      /**
       * Lab 4:  N1QL operations
       *  1. Get orders for customerId
       *     - WHERE order.orderStatus != 'created'
       *     - Document properties needed (more can be provided):
       *         id, 
       *         orderStatus, 
       *         shippingInfo.name aliased as shippedTo, 
       *         grandTotal, 
       *         lineItems,
       *         orderDate (hint use MILLIS_TO_STR())
       *
       */
      return "NOP";
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:getOrders() - error:");
      return { orders: null, error: err };
    }
  }

  async getNewOrder(customerId){
    try{
      /**
       * Lab 4:  N1QL operations
       *  1. Get latest order for customerId
       *     - WHERE order.orderStatus = 'created'
       *     - Document properties needed (more can be provided):
       *         doc, custId, orderStatus,
       *         billingInfo, shippingInfo, shippingTotal,
       *         tax, lineItems, grandTotal, orderId, _id
       *
       */
      return "NOP";
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:getNewOrder() - error:");
      return { orders: null, error: err };
    }
  }

  async saveAddress(custId, path, address) {
    try {
      /**
       * Lab 5:  K/V sub-document operation(s):
       *  1.  generate key:  customer_<custId>
       *  2.  get customer addresses
       *  3.  create business logic to add new address
       *  4.  update customer address path
       *  5.  update customer modified date and modifiedBy
       *
       *
       *  When updating, think about pros/cons to UPSERT v. REPLACE
       */
      return "NOP";
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:saveAddress() - error:");
      return { success: null, error: err };
    }
  }

  async updateAddress(custId, path, address) {
    try {
      /**
       * Lab 5:  K/V sub-document operation(s):
       *  1.  generate key:  customer_<custId>
       *  2.  update customer document address path
       *  3.  update customer document modified date and modifiedBy
       *
       *  When updating, think about pros/cons to UPSERT v. REPLACE
       */
      return "NOP";
    }catch(err){
      //Optional - add business logic to handle error types
      outputMessage(err, "repository.js:updateAddress() - error:");
      return { success: false, error: err };
    }
  }
  

  /**
   * Helper methods:
   *    getNewCustomerDocument()
   *    getNewUserDocument()
   *    getLastOrderId()
   *    getLastCustomerId()
   *    getLastUserId()
   */

  

  async getNewCustomerDocument(userInfo) {
    let custId = await this.getLastCustomerId();
    let key = `customer_${custId + 1}`;
    let date = new Date();
    let createDateTimeStamp = Math.floor(date / 1000);
    let currentDay = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;

    return {
      doc: {
        type: "customer",
        schema: "1.0.0",
        created: createDateTimeStamp,
        createdBy: 1234,
      },
      _id: key,
      custId: custId + 1,
      custName: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
      },
      username: userInfo.username,
      email: userInfo.email,
      createdOn: currentDay,
      address: {
        home: {
          address: "1234 Main St",
          city: "Some City",
          state: "TX",
          zipCode: "12345",
          country: "US",
        },
        work: {
          address: "1234 Main St",
          city: "Some City",
          state: "TX",
          zipCode: "12345",
          country: "US",
        },
      },
      mainPhone: {
        phone_number: "1234567891",
        extension: "1234",
      },
      additionalPhones: {
        type: "work",
        phone_number: "1234567891",
        extension: "1234",
      }
    };
  }

  async getNewUserDocument(userInfo) {
    let userId = await this.getLastUserId();
    let key = `user_${userId + 1}`;

    return {
      docType: "user",
      _id: key,
      userId: userId + 1,
      username: userInfo.username,
      password: userInfo.password,
    };
  }

  async getLastOrderId() {
    let n1qlQuery = `
      SELECT o.orderId 
      FROM \`${this.bucketName}\` o 
      WHERE o.doc.type='order' 
      ORDER BY o.orderId DESC 
      LIMIT 1;`;

    let result = await this.cluster.query(n1qlQuery);
    if(result.rows && result.rows.length > 0){
      return parseInt(result.rows[0].orderId);
    }
    return 0;
  }

  async getLastCustomerId() {
    let n1qlQuery = `
      SELECT c.custId 
      FROM \`${this.bucketName}\` c 
      WHERE c.doc.type='customer' 
      ORDER BY c.custId DESC 
      LIMIT 1;`;

    let result = await this.cluster.query(n1qlQuery);
    if(result.rows && result.rows.length > 0){
      return parseInt(result.rows[0].custId);
    }
    return 0;
  }

  async getLastUserId() {
    let n1qlQuery = `
      SELECT u.userId 
      FROM \`${this.bucketName}\` u 
      WHERE u.docType='user' 
      ORDER BY u.userId DESC 
      LIMIT 1;`;

    let result = await this.cluster.query(n1qlQuery);
    if(result.rows && result.rows.length > 0){
      return parseInt(result.rows[0].userId);
    }
    return 0;
  }

  async getObjectByKey(key){
    try{
      let result = await this.collection.get(key);
      return { result: result.value, error: null };
    }catch(err){
      outputMessage(
        err,
        "repository.js:getLastUserId() - error finding the latest userId."
      );
      return {
        result: null, error: err        
      };
    }
  }
}

/**
 *
 * @callback Repository~couchbaseCallback
 * @param {Object} error - Couchbase error object
 * @param {Object} result - Couchbase result object
 *
 */

/**
 * @module Repository
 *
 */

module.exports = new Repository();
