const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
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

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.NEXT_PUBLIC_CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        next();
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" })
    }
}

async function run() {
    try {
        // await client.connect();

        const db = client.db("MediQueue");
        const tutorCollection = db.collection("tutorData");
        const userBookingCollection = db.collection("bookings");

        // get tutor data in home page
        app.get("/homePageTutorData", async (req, res) => {
            const result = await tutorCollection.aggregate([{ $limit: 6 }]).toArray()
            res.send(result);
        })

        // creating post api for add tutor data
        app.post("/addTutor", verifyToken, async (req, res) => {
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
        app.get("/allTutorData/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await tutorCollection.findOne(query);
            res.send(result);
        })

        // reduce slot number
        app.put("/allTutorData/:id/decreaseSlot", verifyToken, async (req, res) => {
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

        // post api for my booking section
        app.post("/booking", verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await userBookingCollection.insertOne(bookingData);
            res.send(result);
        })

        // get api for getting user booking information
        app.get("/booking/:userId", verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const result = await userBookingCollection.find({ userId }).toArray();
            res.send(result);
        })

        // patch api for changing the state to rejected
        app.patch("/booking/reject/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const update = {
                $set: {
                    status: "Rejected"
                }
            }
            const result = await userBookingCollection.updateOne(query, update);
            res.send(result);
        })

        // patch api for changing the state to confirmed
        app.patch("/booking/confirm/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const update = {
                $set: {
                    status: "Confirmed"
                }
            }
            const result = await userBookingCollection.updateOne(query, update);
            res.send(result);
        })

        // get api for get the user create tutor information
        app.get("/myTutor/:userId", verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const result = await tutorCollection.find({ userId }).toArray();
            res.send(result);
        })

        // delete api for delete an existing tutor
        app.delete("/allTutorData/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await tutorCollection.deleteOne(query);
            res.send(result);
        })

        // patch api for edit tutor details
        app.patch("/allTutorData/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const query = {
                _id: new ObjectId(id)
            }

            const update = {
                $set: updateData
            }
            const result = await tutorCollection.updateOne(query, update);
            res.send(result);
        })

        // get api for search by tutor name
        app.get("/searchTutor", async (req, res) => {
            const search = req.query.search;
            const query = {
                name: {
                    $regex: search,
                    $options: "i"
                }
            };
            const result = await tutorCollection.find(query).toArray();
            res.send(result);
        });

        // get api for filtering
        app.get("/filterTutor", async (req, res) => {
            const { startDate, endDate } = req.query;

            const query = {
                sessionStartDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            const result = await tutorCollection.find(query).toArray();
            res.send(result);
        });

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
