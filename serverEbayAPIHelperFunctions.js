//import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();





export async function getAccessTokenAndDevURL(environment, searchItem) {

    
    let client_idSandbox = process.env.CLIENT_ID_SANDBOX
    let client_secretSandbox = process.env.CLIENT_SECRET_SANDBOX

    let client_idProduction = process.env.CLIENT_ID_PRODUCTION
    let client_secretProduction = process.env.CLIENT_SECRET_PRODUCTION
    
    
    
    let credentials = ``
    let accessToken = ''
    let clientCredentialsUrl = ''
    let ebayUrl = ''
    
    //searchItem = encodeURIComponent(searchItem); // encode special characters

    if (environment.toLowerCase() === 'sandbox') {
      credentials = `${client_idSandbox}:${client_secretSandbox}`;
      clientCredentialsUrl = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      ebayUrl = `https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=${searchItem}&category_ids=6001&limit=100`
      //browseAPIURL = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchItem}&limit=5`

    } else if (environment.toLowerCase() === 'production') {
        credentials = `${client_idProduction}:${client_secretProduction}`
        clientCredentialsUrl = 'https://api.ebay.com/identity/v1/oauth2/token'
        ebayUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchItem}&category_ids=6001&limit=100`
    }

    const base64Credentials = Buffer.from(credentials).toString('base64');

    let bodyData = new URLSearchParams()
bodyData.append('grant_type', "client_credentials")
bodyData.append('scope', "https://api.ebay.com/oauth/api_scope")

bodyData.toString()

//1 - get Oauth access using client credentials flow
const responseAuth = await fetch(clientCredentialsUrl, {
    method: "POST",
    headers: {
        "Content-Type" : "application/x-www-form-urlencoded",
        "Authorization": `Basic ${base64Credentials}`,
    },
    body: bodyData
})

const dataAuth = await responseAuth.json()
console.log("data from dataAuth is: ", dataAuth);
let ebayAccessToken = dataAuth.access_token
return [ ebayAccessToken, ebayUrl ]

}

export async function getListings(ebayUrl, ebayAccessToken) {
    


const response = await fetch(ebayUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${ebayAccessToken}`,  // 🔐 Required
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_UK"               // 🌍 Adjust for region if needed
    }
})

const data = await response.json()
console.log("data from browse api request is: ", data);

let listingsList = data.itemSummaries

let itemSearchResults = []

if (data.total === 0) {
    return null;
}

for (const listing of listingsList) {
    console.log(listing.title)

    let item = {}
    item.title = listing.title;
    item.price = listing.price;
    item.condition = listing.condition;
    

    itemSearchResults.push(item)
}

return itemSearchResults;

}





async function getUSDToGBPConversion(usdPrice) {
  return usdPrice * 0.75
}

async function getCADToGBPConversion(cadPrice) {
  return cadPrice * 0.54
}

export async function convertToGBP(relevantResults) {
    //should be an array

    let convertedToGDP = await Promise.all(relevantResults.map(async (result) => {
        if (result.price.currency === 'GBP') {
            return result
        } else if (result.price.currency === 'USD') {
            const convertedPrice = await getUSDToGBPConversion(result.price.value);
            //let gdpPrice = (parseFloat(result.price.value) * usdToGbpRate).toFixed(2);

            let newResult = {
                title: result.title,
                price: { value: convertedPrice, currency: "GBP" },
                condition: result.condition
            }

            return newResult;
        } else if (result.price.currency === 'CAD') {
            const cadToGbpRate = await getCADToGBPConversion();
            let gdpPrice = (parseFloat(result.price.value) * cadToGbpRate).toFixed(2);

            let newResult = {
                title: result.title,
                price: { value: gdpPrice, currency: "GBP" },
                condition: result.condition
            }

            return newResult;
        } else {
            return null;
        }
    }))

    return convertedToGDP.filter(res => res !== null);
}