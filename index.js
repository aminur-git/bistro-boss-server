const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());

// Middleware

const verifyToken = (req, res, next) => {
  // console.log('from middleware', req.headers.authorization
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Forbidden Access" });
  } else if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    console.log(token);

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).send({ message: "Forbidden Access" });
      } else {
        req.decoded = decoded;
        console.log("decoded", decoded);
        next();
      }
    });
  }
};




const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1e5bd1t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log("Trying to connect to MongoDB...");
    await client.connect();
    const database = client.db("bistrobossDB");
    const menuCollection = database.collection("menu");
    const cartCollection = database.collection("cart");
    const usersCollection = database.collection("users");

    // ====================== |_jwt_| related APIs ============

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });


    // <======================== verify Admin ======================================>
const verifyAdmin = async(req, res, next)=>{
   const email = req.decoded.userInfo;
    const query = {email: email}
    const user = await usersCollection.findOne(query);
    const isAdmin = user?.role === 'admin'
    if(!isAdmin){
      return res.status(403).send({message: 'forbidden access'})
    }
    next()
}



    // users related APIs

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.userInfo) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({
          message: "পুরাতন ইউজার লগিন করছে",
          insertedId: null,
        });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/users", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // cart related APIs
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
      console.log(email);
    });

    app.delete("/cart", async (req, res) => {
      const id = req.query.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}
run().catch(console.dir);

// ✅ Routes are safe to define now
app.get("/", (req, res) => {
  res.send("server online.....");
});

app.listen(port, () => {
  console.log("Bistro-Boss is running on port:", port);
});
