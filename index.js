const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const app = express()
const PORT = process.env.PORT || 8000
dotenv.config();

const uri = process.env.AUTH_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.use(cors());
app.use(express.json());

async function run() {
    try {
        await client.connect();

        const db = client.db("MediQueue");
        const tutorCollection = db.collection("tutorData");

        // get tutor data in home page
        app.get("/homePageTutorData", async (req, res) => {
            const result = await tutorCollection.aggregate([{ $limit: 6 }]).toArray()
            res.send(result);
        })

        // creating post api for add tutor data
        app.post("/addTutor", async (req, res) => {
            const tutors = req.body;
            const result = await tutorCollection.insertOne(tutors);
            res.send(result);
        });

        // get tutor data
        app.get("/allTutorData", async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.send(result);
        })

        // get tutor details
        app.get("/allTutorData/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await tutorCollection.findOne(query);
            res.send(result);
        })

        // reduce slot number
        app.patch("/allTutorData/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const tutor = await tutorCollection.findOne(query);

            const update = {
                $set: {
                    totalSlot: (parseInt(tutor.totalSlot) - 1).toString()
                }
            }
            const result = await tutorCollection.updateOne(query, update);
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})
