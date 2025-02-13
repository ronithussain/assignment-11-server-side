const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 8000;

// MiddleWare
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Service reviews server side is running now');
});

// DB_USER: service_reviews
// DB_PASSWORD: HoW8SG6yNsKbYliU




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.s5ifh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Service related APIS Collection 1:
    const serviceCollection = client.db('service_reviews').collection('services')
    // ServiceDetails related APIS collection 2:
    const reviewsCollection = client.db('service_reviews').collection('reviews');

    // create add service apis
    app.post('/add-service', async (req, res) => {
      const addData = req.body;
      const result = await serviceCollection.insertOne(addData);
      console.log(addData, result);
      res.send(result);
    })
    // get kore service page e add service er data gulo show kora holo.
    app.get('/services', async (req, res) => {
      //req.query.limit: The limit is obtained from the URL query parameter, If the limit query is not provided, it will default to 0, meaning there is no limit.
      const limit = parseInt(req.query.limit) || 0;
      // serviceCollection.find(): This method is used to search for documents in the MongoDB collection.
      // .limit(limit): This specifies how many service documents should be returned from MongoDB.
      const cursor = serviceCollection.find().limit(limit);
      const result = await cursor.toArray();
      res.send(result);
    })

    // service details api
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;

      // Check if ID is valid
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const service = await serviceCollection.findOne(query);

        // console.log("Fetched Service Data:", service); 

        if (!service) {
          return res.status(404).json({ error: "Service not found" });
        }

        res.json(service); // Send JSON response
      } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // save a add-reviews data in database
    app.post('/add-reviews', async (req, res) => {
      // 1. save data in reviews Collection
      const addReviews = req.body;
      const result = await reviewsCollection.insertOne(addReviews);

      // 2. increase review_count in serviceCollection
      const filter = {
        _id: new ObjectId(addReviews.
          reviewId)
      }
      const update = {
        $inc: { review_count: 1 }
      }
      const updateReviewCount = await serviceCollection.updateOne(filter, update);
      console.log(updateReviewCount);
      res.send(result);
    })
    app.get('/my-reviews/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })
    // delete functionality
    app.delete('/delete-review/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    })
    // update review data in db
    app.put('/update-review/:id', async(req, res)=> {
      const id = req.params.id;
      const reviewData = req.body;
      const update = {
        $set: reviewData,
      }
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const result = await reviewsCollection.updateOne( filter, update,options)
      // console.log(result);
      res.send(result);
    })







    // app.post('/services/:id/reviews', async (req, res) => {
    //   const { id } = req.params;
    //   const { userName, userPhoto, text, rating, date } = req.body;

    //   const newReview = {
    //     serviceId: id, // সার্ভিস আইডি সংরক্ষণ
    //     userName,
    //     userPhoto,
    //     text,
    //     rating,
    //     date,
    //   };

    //   try {
    //     const result = await reviewsCollection.insertOne(newReview);
    //     res.status(201).json({ success: true, review: newReview });
    //   } catch (error) {
    //     console.error("Error adding review:", error);
    //     res.status(500).json({ error: "Failed to add review" });
    //   }
    // });

    // app.get('/services/:id/reviews', async (req, res) => {
    //   const { id } = req.params;
    //   try {
    //     const reviews = await reviewsCollection.find({ serviceId: id }).toArray();
    //     res.json(reviews);
    //   } catch (error) {
    //     console.error("Error fetching reviews:", error);
    //     res.status(500).json({ error: "Failed to fetch reviews" });
    //   }
    // });










  }
  finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`service reviews server is running on port: ${port}`);
});
