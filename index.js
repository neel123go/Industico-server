const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECURE_KEY);
const app = express();
const port = process.env.PORT || 5000;


// Use Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uslxqq5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("Industico").collection("tools");
        const usersCollection = client.db("Industico").collection("users");
        const ordersCollection = client.db("Industico").collection("orders");
        const paymentsCollection = client.db("Industico").collection("payments");
        const reviewsCollection = client.db("Industico").collection("reviews");

        // get all tools
        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        // get single tool by id
        app.get('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.findOne(query);
            res.send(result);
        });

        // update or insert verify user in the database
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20d' });
            res.send(result);
        });

        // insert user order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // get user by email
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        // get user order by email
        app.get('/order/:email', async (req, res) => {
            const email = req.params.email;
            const order = await ordersCollection.find({ email }).toArray();
            res.send(order);
        });

        // delete user order by id
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        // get user order by id
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order);
        });

        // api for checkout
        app.post('/create-payment-intent', async (req, res) => {
            const tool = req.body;
            const price = tool.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        // update order information
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    status: payment.status,
                    transactionId: payment?.transactionId
                }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder);
        });

        // insert user review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });

        // get user review
        app.get('/review', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        });

        // get all users
        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })

        // make user admin
        app.put("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const user = await usersCollection.updateOne(filter, updateDoc);
            res.send(user);
        });

        // check admin role
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        });

        // insert items
        app.post('/items', async (req, res) => {
            const tool = req.body;
            const result = await toolsCollection.insertOne(tool);
            res.send(result);
        });

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Industico Server');
});

app.listen(port, () => {
    console.log('Listening to the port', port);
});