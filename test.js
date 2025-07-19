let accessToken = '632a1890f77edd1339c385fd96cb29fe'



async function getUSDToGBPConversion(usdPrice) {
  const response = await fetch(`http://api.exchangeratesapi.io/v1/convert?access_key=${accessToken}&from=USD&to=GBP&amount=${usdPrice}`);
  const data = await response.json();
  //return data; // example: 0.78
  console.log("data from usd to gbp is: ", data)
}

async function getCADToGBPConversion(cadPrice) {
  const response = await fetch(`http://api.exchangeratesapi.io/v1/convert?access_key=${accessToken}&from=CAD&to=GBP&amount=${cadPrice}`);
  const data = await response.json();
  //return data; // example: 0.78
  console.log("data from cad to gbp is: ", data)
}

await getCADToGBPConversion(67)
await getUSDToGBPConversion(67)