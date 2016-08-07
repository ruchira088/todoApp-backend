const express = require("express")
const bodyParser = require("body-parser")
const mongoClient = require("mongodb").MongoClient
const moment = require("moment")
const http = require("http")
const path = require("path")

const PORT = 8000
const USERS_COLLECTION = "users"
const TODO_LIST_COLLECTION = "todo-list-items"
const MONGO_DB_URL = "mongodb://localhost:27017/todo-list"

const app = express()

const generateToken = (strength = 2, output = "") =>
{
  if (strength === 0)
  {
    return output
  }

  return generateToken(strength - 1, output + Math.random().toString(36).substring(2))
}

const userTokens = (() =>
{
  const userToTokenMap = new Map()
  const tokenToUserMap = new Map()

  const addUser = username =>
  {
    const userToken = userToTokenMap.get(username)

    if (!userToken)
    {
      const token = generateToken()

      userToTokenMap.set(username, token)
      tokenToUserMap.set(token, username)

      return token
    }

    return userToken
  }

  const getUsername = tokenToUserMap.get.bind(tokenToUserMap)

  const removeUser = username =>
  {
    const token = userToTokenMap.get(username)
    userToTokenMap.delete(username)
    tokenToUserMap.delete(token)
  }

  return {addUser, removeUser, getUsername}

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

const handleResult = (response, errorMessage = "Unable to perform DB operation") => success => (err, results) =>
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
    database.collection(USERS_COLLECTION).find({username, password}).limit(1)
      .toArray(handleResult(response)(({length}) =>
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

    Promise.all([
      database.collection(USERS_COLLECTION).insertOne({username, password}),
      database.collection(TODO_LIST_COLLECTION).insertOne({username, tasks: []})
    ]).then(() =>
    {
      response.status(200).json({message: "Successfully registered user."})
    }).catch(() =>
    {
      response.status(500).json({error: "Unable to register user"})
    })

    // runAsync.callbacks(() => response.status(500).json({error: "Unable to register user"}))(function* (callback)
    // {
    //   yield database.collection(USERS_COLLECTION).insertOne({username, password}, callback)
    //   yield database.collection(TODO_LIST_COLLECTION).insertOne({username, tasks: []}, callback)
    //   response.status(200).json({message: "Successfully registered user."})
    // })

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

app.use((request, response, next) =>
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

app.get("/logout", ({username}, response) =>
{
  userTokens.removeUser(username)
  response.json({message: "Successfully logged out", username})
})

app.route("/list")
  .get((request, response) =>
  {
    const {username} = request

    database.collection(TODO_LIST_COLLECTION).find({username}).limit(1).toArray(
      handleResult(response, "Unable to fetch the todo list")(docs =>
      {
        response.json({username, tasks: docs[0].tasks})
      }))
  })
  .all(({body: {dueDate}}, response, next) => {
    if(dueDate && !moment(dueDate, moment.ISO_8601).isValid())
    {
      response.status(400)
        .json({error: "Date time format is NOT valid. Plese use the ISO 8601 date time format."})
    } else
    {
      next()
    }
  })
  .post((request, response) =>
  {
    const {username, body: {task, dueDate}} = request

    const todoItem = {
      id: generateToken(1),
      dueDate,
      task
    }

    database.collection(TODO_LIST_COLLECTION).updateOne({username}, {$push: {tasks: todoItem}},
      handleResult(response, "Unable to add to the todo list")(() =>
      {
        response.json({username, todoItem})
      }))
  })
  .put((request, response) =>
  {
    const {username, body: {task, id}} = request

    database.collection(TODO_LIST_COLLECTION)
      .updateOne({username, "tasks.id": id}, {$set: {"tasks.$.task": task}},
        handleResult(response, "Unable to update task")(({result: {n}}) =>
        {
          if(n == 1)
          {
            response.json({username, todoItem: {id, task}})
          } else
          {
            response.status(400).json({error: `task with id "${id}" NOT found.`})
          }
        })
      )
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