const express = require("express")
const bodyParser = require("body-parser")
const mongoClient = require("mongodb").MongoClient
const http = require("http")
const path = require("path")

const { runAsync } = require("./helpers")

const PORT = 8000
const USERS_COLLECTION = "users"
const TODO_LIST_COLLECTION = "todo-list-items"
const MONGO_DB_URL = "mongodb://localhost:27017/todo-list"

const app = express()
const userTokens = (() =>
{
  const userToTokenMap = new Map()
  const tokenToUserMap = new Map()

  const addUser = username =>
  {
    const userToken = userToTokenMap.get(username)

    if (!userToken)
    {
      const token = Math.random().toString(36).substring(2)

      userToTokenMap.set(username, token)
      tokenToUserMap.set(token, username)

      return token
    }

    return userToken
  }

  const getUsername = tokenToUserMap.get.bind(tokenToUserMap)

  return {addUser, getUsername}

})()

let database

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

const credentialsPresent = ({body}, response) =>
{
  const {username, password} = body

  if (!username || !password)
  {
    response.status(400).json({error: "All credential fields are NOT present."})
    return false
  }

  return true
}

const handleResult = (response, errorMessage) => success => (err, results) =>
{
  if (err)
  {
    response.status(500).json({error: errorMessage})
  } else
  {
    success(results)
  }
}

app.post("/login", (request, response) =>
{
  const {username, password} = request.body

  if (credentialsPresent(request, response))
  {
    database.collection(USERS_COLLECTION).find({username, password})
      .toArray(handleResult(response, "Something went wrong")(({length}) =>
      {
        if (length > 0)
        {
          response.status(200).json({message: "Success", token: userTokens.addUser(username)})
        } else
        {
          response.status(401).json({error: "Invalid credentials."})
        }
      }))
  }
})

app.post("/register", (request, response) =>
{
  const {username, password} = request.body

  if (credentialsPresent(request, response))
  {

    runAsync.callbacks(() => response.status(500).json({error: "Unable to register user"}))(function* (callback)
    {
      yield database.collection(USERS_COLLECTION).insertOne({username, password}, callback)
      yield database.collection(TODO_LIST_COLLECTION).insertOne({username}, callback)
      response.status(200).json({message: "Successfully registered user."})
    })

    // database.collection(USERS_COLLECTION).insertOne({username, password},
    //   handleResult(response, "Unable to register user.")(() =>
    //   {
    //     database.collection(TODO_LIST_COLLECTION).insertOne({username},
    //       handleResult(response, "Unable to create todo list")(() =>
    //       {
    //         response.status(200).json({message: "Successfully registered user."})
    //       }))
    //   }))
  }
})

app.route("/*").all((request, response, next) =>
{
  const token = request.get("token")

  if (!token)
  {
    response.status(400).json({error: "Token NOT present."})
  } else
  {
    const username = userTokens.getUsername(token)

    if (!username)
    {
      response.status(401).json({error: "Invalid token."})
    } else
    {
      request.username = username
      next()
    }
  }
})

app.route("/list")
  .get((request, response) =>
  {
    const {username} = request

    database.collection(TODO_LIST_COLLECTION).find({username}).toArray(
      handleResult(response, "Unable to fetch todo list")(docs =>
      {
        response.json({username})
      }))
  })
  .post((request, response) =>
  {
    const {username, body: {task}} = request


  })

mongoClient.connect(MONGO_DB_URL, (err, db) =>
{
  if (err)
  {
    console.log("Unable to connect to the database.")
  } else
  {
    console.log("Successfully connected to the database.")
    database = db

    http.createServer(app)
      .listen(PORT, () => console.log(`Server is listening on port: ${PORT}`))
  }
})