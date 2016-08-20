const express = require("express")
const bodyParser = require("body-parser")
const mongoClient = require("mongodb").MongoClient
const moment = require("moment")
const http = require("http")

const {PORT, MONGO_DB_URL} = require("./constants")

const resourceRoute = require("./routes/resources")
const listRoute = require("./routes/list")
const taskRoute = require("./routes/task")
const accountRoute = require("./routes/account")

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

mongoClient.connect(MONGO_DB_URL, (err, db) =>
{
    if (err)
    {
        console.log("Unable to connect to the database.")
    } else
    {
        console.log("Successfully connected to the database.")

        app.use("/resources", resourceRoute(db))
        app.use("/", accountRoute(db))
        app.use("/list", listRoute(db))
        app.use("/task", taskRoute(db))

        http.createServer(app)
            .listen(PORT, () => console.log(`Server is listening on port: ${PORT}`))
    }
})