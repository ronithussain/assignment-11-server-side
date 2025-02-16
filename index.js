const express = require('express');
const cors = require('cors');
require('dotenv').config();

// json web token start here
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
// json web token end here

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 8000;

// MiddleWare
app.use(cors({
  origin: ['http://localhost:5173', 'https://assignment-11-825ef.web.app', 'https://assignment-11-825ef.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log('Request from:', req.headers.origin);
  next();
});


app.get('/', (req, res) => {
  res.send('Service reviews server side is running now');
});




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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Service related APIS Collection 1:
    const serviceCollection = client.db('service_reviews').collection('services')

    // ServiceDetails related APIS collection 2:
    const reviewsCollection = client.db('service_reviews').collection('reviews');

    // JWT TOKEN Starts here-------->
    // 1:
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
        })
        .send({ success: true })
    })

    //2: clear cookie
    app.post('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
        })
        .send({ success: true })
    })
    // verify the token
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;

      if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }

      // verify
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {

        if (err) {
          return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.user = decoded;
        next();

      })
    }

    // JWT TOKEN Ends here---------->






    // create add service apis
    app.post('/add-service', async (req, res) => {
      const addData = req.body;
      const result = await serviceCollection.insertOne(addData);
      console.log(addData, result);
      res.send(result);
    })

    // get kore service page e add service er data gulo show kora holo.
    app.get('/services', async (req, res) => {
      const limit = parseInt(req.query.limit) || 0;

      // filter and search starts here
      const filter = req.query.filter; // filter 
      let search = req.query.search; // search

      if (search && typeof search !== 'string') {
        search = String(search);
      }

      let query = {};

      if (search) {
        query.title = {
          $regex: search,
          $options: 'i',
        };
      }

      if (filter) query.category = filter;
      // filter and search ends here

      const cursor = serviceCollection.find(query).limit(limit);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all services by a specific user
    app.get('/my-service/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }

      console.log(req.cookies);

      // search functionality starts here
      let search = req.query.search // search

      if (!search || typeof search !== "string") {
        search = "";
      }
      console.log(search);

      if (search.trim() !== "") {
        query.category = { $regex: search.trim(), $options: "i" };
      }
      // search functionality ends here

      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    })

    // delete a service in my-service route
    app.delete('/my-service-delete/:id', async (req, res) => {
      const id = req.params.id;
      console.log("Received ID:", req.params.id);
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    })

    // update a service in my-service-update route
    app.put('/my-service-update/:id', async (req, res) => {
      const id = req.params.id;
      const serviceUpdateData = req.body;
      const update = {
        $set: serviceUpdateData,
      }
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await reviewsCollection.updateOne(filter, update, options)
      console.log(result);
      res.send(result);
    });

    // service details api
    app.get('/services/:id',verifyToken, async (req, res) => {
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
    app.post('/add-reviews',verifyToken, async (req, res) => {
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

    app.get('/my-reviews/:email',verifyToken, async (req, res) => {
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
    app.put('/update-review/:id', async (req, res) => {
      const id = req.params.id;
      const reviewData = req.body;
      const update = {
        $set: reviewData,
      }
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await reviewsCollection.updateOne(filter, update, options)
      // console.log(result);
      res.send(result);
    })

    // countUp ___________________
    app.get('/stats', async (req, res) => {
      try {
        const usersCount = await client.db('service_reviews').collection('users').countDocuments();
        const reviewsCount = await client.db('service_reviews').collection('reviews').countDocuments();
        const servicesCount = await client.db('service_reviews').collection('services').countDocuments();

        res.json({
          users: usersCount,
          reviews: reviewsCount,
          services: servicesCount
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    });



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
