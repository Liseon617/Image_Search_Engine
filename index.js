import express from 'express';
import fileUpload from 'express-fileupload';
import * as fs from 'fs';
import cors from 'cors';
import weaviate from 'weaviate-ts-client';
import { setTimeout } from 'timers/promises';


const app = express();
app.use(fileUpload());
app.use(cors());

const route = express.Router();

app.use('/v1', route);

var imagePath;
const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
})
client.schema
        .getter()
        .do()
        .then((res) => {
          console.log(res);
        }).catch((err) => {
          console.log(err);
        })

//create current schema
const schemaConfig = {
  'class': 'Meme',
  'vectorizer': 'img2vec-neural',
  'vectorIndexType': 'hnsw', /*hierarchical navigable small worlds graph index*/
  'moduleConfig': {
      'img2vec-neural': {
          'imageFields': ['image'],
      }
  },
  //blob to describe image, string to describe image metadata
  'properties':[
      {
          'name':'image',
          'dataType': ['blob']
      },
      {
          'name':'text',
          'dataType': ['string']
      }
  ]
}

client.schema
    .classCreator()
    .withClass(schemaConfig)
    .do()
    .catch(err => {
        console.log("Error detected:\n" + err.message);
    });
async function updateImageBank(imgFile){
  const img = fs.readFileSync(`./image_databank/database/${imgFile}`);
  const b64 = Buffer.from(img).toString('base64');

  await client.data.creator()
      .withClassName('Meme')
      .withProperties({
          image: b64,
          text: imgFile.split('.')[0].split('_').join(' ')
      })
      .do();
}

async function removeContents(filePath){
  const prevResults = fs.readdirSync(filePath);
  for(const file of prevResults){
    fs.unlinkSync(`${filePath}/${file}`);
  }
}
async function testImage(filepath){
  //clear folder of previous results from "./client/src/result"
  //removeContents(`./client/src/result`);

  //use weaviate to check
  const limit = 100
  const test = Buffer.from(fs.readFileSync(filepath)).toString('base64');
  const resImage = await client.graphql.get()
                      .withClassName('Meme')
                      .withFields(['image'])
                      .withNearImage({image: test})
                      .withLimit(limit)
                      .do();
  const resultArray = await resImage.data.Get.Meme;
  var sizeAmount = limit / 4;
  var resOutput = [];
  resOutput[0] =
  {title:"test", value: (sizeAmount-= (sizeAmount/20)) * 20, type: "high", image: "result-0.jpg"};
  fs.writeFileSync(`./client/src/Result/result-0.jpg`, test, 'base64');
  console.log(resultArray.length);
  for (let i = 1; i <= resultArray.length; i++) {
      const current = await resultArray[i - 1].image;
      if(i != 1 ){
          const prev = await resultArray[i - 2].image;

          if(prev != current){
              resOutput[resOutput.length] =
              {title:"test", value: (sizeAmount-= (sizeAmount/20)) * 20, type: "middle", image: `result-${i}.jpg`};
              fs.writeFileSync(`./client/src/result/result-${i}.jpg`, current, 'base64');
          }
      } else {
        resOutput[resOutput.length] =
        {title:"test", value: (sizeAmount-= (sizeAmount/20)) * 20, type: "middle", image: `result-${i}.jpg`};
        fs.writeFileSync(`./client/src/result/result-${i}.jpg`, current, 'base64');
      }
      // resOutput[resOutput.length] = 
      // {title:"test", value: (resultArray.length - i) * 100, type: "middle", image: current};
      // fs.writeFileSync(`./image_databank/result/result-${i - 1}.jpg`, current, 'base64');
  }
  // const result = resImage.data.Get.Meme[0].image;
  // resOutput.push(resImage.data.Get.Meme[0]);
  // fs.writeFileSync('./image_databank/result/result.jpg', result, 'base64');
  console.log(resOutput.length);
  return await resOutput;
}

async function testResult(){
  const imageBank = fs.readdirSync('./image_databank/database');
  const promises = imageBank.map(updateImageBank);
  await Promise.all(promises);
  if(imagePath){
    var upload = await testImage(imagePath);
    if(upload){
      //await waitForFileToExist("./client/src/result/result-0.jpg");
      return upload;
    }
  }
  return null;
}

async function waitForFileToExist(file){
  return new Promise((resolve, reject) => {
    const checkFile = () => {
    setTimeout(() => {
      const fileExists = fs.existsSync(file);
      if (fileExists) {
        resolve(true);
      } else {
        checkFile();
      }
    }, 1000);
  };
  checkFile();
  });
}
// app.get('/api', (req, res) => {
//   res.json({ message: 'Hello from Express!' });
// });

app.get('/download', async (req, res) => {
  //update weaviate databank
  console.log("hello0");
  const upload = await testResult();
  console.log(upload);
  //await waitForFileToExist("./client/src/result/result-0.jpg");
  if(upload != null){
    console.log("hello1");
    res.send(upload);
  } else{
    console.log("hello2");
  }
})

app.post('/upload', (req, res) => {
  if(!req.files || !req.files.image){
    return res.status(400).json({message: 'no image provided'});
  }

  const image = req.files.image;
  const fileName = image.name;
  removeContents("./image_databank/temp");
  imagePath = `./image_databank/temp/${fileName}`;
  image.mv(imagePath, (err) => {
    if(err) {
      console.error(err);
      return res.status(500).send(err);
    }

    res.json({ message: 'Image uploaded successfully' });
    //fs.
  })
})

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});