

//send fetch request to that endpoint, with right headers and body



export async function getWeBuyAnyCarDetails(regNum, mileage) {

  console.log("regNum inside of function is: ", regNum, "and mileage: ", mileage)

const payload = {
    vrm: regNum,
    journeyName: "SeparateOptExtras",
    journeyVariant: "VDSurvey",
    mileage: mileage
};



  const response = await fetch('https://api.webuyanycar.com/v2.1/vehicles', {
    method: "POST",
    headers: {
    "Authorization": "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6InB1YmxpYyIsInVzcklkIjoiOTk5OSIsInVzckdkIjoiNjYyMDJDRkYtQjVGRS00NTdGLUI4NjYtRUI4MDhGMThDOThEIiwidmlzSWQiOiI2NDQ1NjgzNTIiLCJkZXZJZCI6IjQ2ODg4NTAwNSIsImRldkdkIjoiNzRjYmY5MjQtNTIxNS00Mzg3LTk4ZGEtNTRjYWVlZjMyZWU5Iiwid2ViSWQiOiIzIiwicmVmdyI6IjE3NTMyMTU2NTkiLCJyZWYiOiIxNzUzMjEyMDU5IiwibmJmIjoxNzUzMjEwNTUwLCJleHAiOjE3ODQ3NDY1NTAsImlzcyI6IldCQUNBdXRoU3ZjIzliNGM2MzY5LTY5YzUtNDZkNC1hNmE1LWMxNjViNzc0Y2YyZiIsImF1ZCI6InB1YmxpYyJ9.qt8et02QfiK6rWtBkknw-23ZMoqebi_Nbidr002jOUA",
    "Content-Type": "application/json",
    "Origin": "https://www.webuyanycar.com",
    "Referer": "https://www.webuyanycar.com/",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  },
    body: JSON.stringify(payload)
  })

  const data = await response.json();
  console.log("data from call to webuyanycar.com is: ", data);
  console.log("relevant data is: ", data.vehicleLabelValueLists);
  return data.vehicleLabelValueLists
}

//getWeBuyAnyCarDetails("KY17UZL", "3")