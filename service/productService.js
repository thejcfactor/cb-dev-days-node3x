//connection made in server.js -> should cache the repository so only 1 instance instantiated (i.e. singleton pattern)
const db = require("repository/repository");
const { Response } = require("library/response");

module.exports = {
  searchProducts
};

async function searchProducts(product, fuzziness) {
  //TODO:  other FTS options?
  let response = new Response(null, "Operation not built yet.", null, null);
  let result = await db.searchProducts(product, fuzziness);

  if (result.error) {
    response.error = result.error;
    response.message = "Error searching for products.";
    return response;
  }

  if (result == "NOP") {
    return response;
  }

  response.data = result.products;
  response.message = "Successfully searched for products.";
  return response;
}