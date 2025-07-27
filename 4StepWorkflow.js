import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
//import fs from 'fs';
import { getJson } from 'serpapi';
import { Client } from '@gradio/client';
import { getAccessTokenAndDevURL, getListings, convertToGBP } from './serverEbayAPIHelperFunctions.js';
import OpenAI from 'openai';
import { getSpecificsFromWeBuyAnyCar } from './hyperagentHelper.js';
import path from 'path'
import { getWeBuyAnyCarDetails } from './webuyanycar.js';
import fs from 'fs/promises';
import { fileURLToPath } from "url";

dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ or hardcode for testing
});

const app = express();
const PORT = process.env.PORT || 5005;
console.log("Env PORT:", process.env.PORT);
console.log("Using PORT:", PORT);

dotenv.config();

// Allow only frontend origin
app.use(cors({ origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:3000']
      : 'http://localhost:3000' }));//change to public url
app.use(bodyParser.json());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


const upload = multer({ dest: "uploads/" });

/*curl -X POST http://localhost:5001/identify-image \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/c/Users/JoeJo/Downloads/XyAaqBEtYtb8YffjKZ68Gb.jpg"*/ //to test identify-image endpoint



//add a server endpoint for each step of the workflow


app.post("/identify-image", upload.single("image"), async (req, res) => {
  const imagePath = req.file.path;
  console.log(`Processing image: ${imagePath}`);

  // Turn local file path into public URL
const serverUrl = process.env.SERVER_URL || "http://localhost:5005"; // set SERVER_URL in .env
const publicUrl = `${serverUrl}/uploads/${req.file.filename}`;
console.log(`Public image URL: ${publicUrl}`);
//use localhost for now, both backend and frontend

const fullLocalPath = path.join(__dirname, imagePath);

/*const serverUrl = req.protocol + "://" + req.get("host");
const publicUrl = `${serverUrl}/uploads/${req.file.filename}`;
console.log(`Public image URL: ${publicUrl}`);*/
 

  //imagePath needs to be the url at this point, in order to work

  const client = await Client.connect("http://127.0.0.1:7860");//change to hf space url
  //const client = await Client.connect("Baon2024/SellerMVPPython"); //replace with publically-available url for getReg hf space
  const result = await client.predict("/predict", {
    image_path: fullLocalPath,
  });

  console.log("result from hfSpace is: ", result.data);

  const parsed = JSON.parse(result.data[0]);
  console.log("asrdedRegistrationNymber is ",parsed)

// Step 2: Access the registration number
let regNum = parsed.registration_number;

console.log("Extracted reg number:", regNum);

regNum = regNum.replace(/\s+/g, ''); 

  
  //return the regNum to the frontend

  let placeholder = "placeholder server response"
  

  res.status(200).json({ regNum }); // ✅ send result back
});



app.post("/getWBAYandGeneratePrice", async (req, res) => {
  const { regNum } = req.body;

  console.log("regNum in second server endpoint is: ", regNum);

  //do we ask for mileage, or just guess
  let mileage = Math.round((Math.random() * 10)) //could do random number for now, for best UI experience
  //needs to be a whole number, saves error
  mileage = mileage.toString()
  console.log("mileage after toString() is: ", mileage)

  let detailedCarInfo

  if (regNum && mileage) {
  //add here imported function, to use hyperagent to get details - or just manually query, if you add check to get JWT
    //detailedCarInfo = await getSpecificsFromWeBuyAnyCar(regNum, mileage)
    detailedCarInfo = await getWeBuyAnyCarDetails(regNum, mileage)
    //might be safe enough to just call api endpoint, more reliable, for purpose of MVP - and quicker
  } else if ( !regNum && mileage ) {
    console.log("regNum does not exist, mileage does ", mileage)
  } else if ( regNum && !mileage ) {
    console.log("mileage does not exist, regNum does ", regNum)
  } else if ( !regNum && !mileage ) {
    console.log("neither regNum or mileage exist")
  }

  let prompt = `Return ONLY the following strict JSON format, using real values from the provided text. Do not include any extra text, markdown, or commentary. Only return the JSON object in the exact format as follows:

[
  {
    "vehicleDetails": {
      "make": "<make>",
      "model": "<model>",
      "engine": "<engine>",
      "year": <year>,
      "color": "<color>",
      "transmission": "<transmission>"
    },
    "mileage": {
      "lastMOT": {
        "mileage": <mileage>,
        "date": "<date>"
      }
    },
    "valuationGuarantee": {
      "guaranteePeriod": "<guaranteePeriod>"
    }
  }
]

Text:
${JSON.stringify(detailedCarInfo)}

Ensure that the data is extracted from the text above and return ONLY the formatted JSON as requested. Do not include any commentary or additional text.`;

console.log("Prompt is: ", prompt)

  const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.0,
        max_tokens: 500,
      });

  const formattedObject = response.choices[0].message.content.trim()
  console.log("formattedObject is, ", formattedObject)

  let formattedObjectparsed = JSON.parse(formattedObject)
  console.log("formattedObjectparsed is: ", formattedObjectparsed)
  let carSpecs = formattedObjectparsed[0].vehicleDetails
  
  //now, use detailedCarInfo to generate fake rice here
  
let placeholder = "placeholder server response"

  res.status(200).json({ carSpecs })
});

app.post("/llmAssessCarDamage", upload.fields([{ name: "carFront", maxCount: 1 }, { name: "carLeftSide", maxCount: 1 }, { name: "carBack", maxCount: 1}, { name: "carRightSide", maxCount: 1}]), async (req, res) => {
  //one field for each image, to make sure each is present
  //need to make sure formData has carFront, carLeftSide, carBack, carRightSide attached, and prevent submission otherwise
  //have modal for four pictures pop up on successful return from /getWBAYandGeneratePrice endpoint

  //don't code checks either here or frontend for whether each image is correct side - that can be added later for security
  console.log("req.files is: ", req.files);

  let carImages = []
  carImages.push(req.files.carFront[0])
  carImages.push(req.files.carLeftSide[0])
  carImages.push(req.files.carBack[0])
  carImages.push(req.files.carRightSide[0])

  console.log("carImages after pushing all four sides are: ", carImages);

  /*let publicUrls = []
  for (const image of carImages) {
    const serverUrl = "http://localhost:5005"; 
    const publicUrl = `${serverUrl}/uploads/${image.filename}`;
    console.log(`Public image URL: ${publicUrl}`);
    //use localhost for now, both backend and frontend
    publicUrls.push(publicUrl)
  }

  console.log("publicUrls after pushing all four sides are: ", publicUrls);

   let imageContentArray = []


  imageContentArray.unshift({
  type: "text",
  text: `These are four images of a car from each side. Please assess whether there is any visible damage such as dents, scratches, or broken parts. Be specific and mention the location if you spot any issues. ${publicUrls}`
});

console.log("value of imageContentArray before vision model call is: ", imageContentArray);*/

// Convert each image file to base64

const base64Images = await Promise.all(
  carImages.map(async (img) => {
    const data = await fs.readFile(img.path, { encoding: 'base64' });
    return data;
  })
);

const messages = [
  {
    role: "system",
    content: "You are a used car examiner. Identify visible damage like dents or scratches."
  },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "These are four images of a car from each side. Assess damage."
      },
      ...base64Images.map(base64 => ({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64}`
        }
      }))
    ]
  }
];

console.log("value of base64 images and Messages are: ", messages);


//could replace this with custom trained model, that returns label for each image/overall 4 - based on data of images and conditions (multimodal text and image data)
const visionResponse = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: messages,
  max_tokens: 500
});

const damageAssessment = visionResponse.choices[0].message.content;
console.log("🛠️ Damage Assessment:", damageAssessment);


//might also want agentAssessor to provide label: Like New, Very Good, Good, et cetera
//whatever labels exist for used cars, so could then draw nearest real sale prices for car model, or just average discount based on condition

//now, use detailedCarInfo to generate fake price here, then calculatye rice er tye of damage in same section, to deduct
  let fakePrice = "10,000" //would actually need a function here to draw average recent resell price for excellent used car, based on model
  //using Bob's data, or some other 3rd party.
  
  let scruffPrice = "50"

  let assessedPriceAfterDamage = `You are a used car assessor. Your role is to assess how much the car is worth, based on the data provided to you.
  
  
  You have been provided with a damage assessment for the car: ${damageAssessment}. Recent used cars of the same model and sub-model have sold for: £${fakePrice}.

  Each scruff or scratch deducts £${scruffPrice} from the overall resell value of the car.

  Based on this information, calculate the resell value of the car, and return strictly in this JSON format: [{ resellValue: /price-as-number/}] 
  `
  const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: assessedPriceAfterDamage }],
        temperature: 0.0,
        max_tokens: 700,
      });

  const resellResponse = response.choices[0].message.content.trim()
  console.log("value of used car calculated as: , ", resellResponse)
  let dejsonedPrice = JSON.parse(resellResponse);
  console.log("dejsonedPrice is: ", dejsonedPrice)
  let finalPrice = dejsonedPrice[0].resellValue;
  console.log("finalPrice after array and object destructering is: ", finalPrice);

  //in longer term, if we have a dataset of used car sales, with columns like model, condition, price
  //would be straightforward to train via regression a model to predict sale price
  //and could then call it here to generate price, one car per call. 

  res.status(200).json({ finalPrice })//return condition too?
});

app.listen(PORT, () => console.log(`✅ Server running on PORT ${PORT}`));
