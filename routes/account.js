const express = require("express")
const multer = require("multer")
const {Binary} = require("mongodb")
const {handleResult, generateToken} = require("../utils")

const {
  TODO_LIST_COLLECTION,
  USERS_COLLECTION,
  IMAGE_FIELD_NAME,
  RESOURCE_COLLECTION
} = require("../constants")

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

const addUsernameToRequest = (request, response, next) =>
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
}

const route = database =>
{
  const router = express.Router()

  router.route("/account/login")
    .post((request, response) =>
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

  router.route("/account/register")
    .post((request, response) =>
    {
      const {username, password} = request.body

      if (credentialsPresent(request, response))
      {
        database.collection(USERS_COLLECTION).find({username}).limit(1).toArray()
          .then(result =>
          {
            if (result.length > 0)
            {
              return Promise.reject({message: "Username already exists."})
            }
            return result
          })
          .catch(error =>
          {
            response.status(400).json(error)
            return Promise.reject({completed: true})
          })
          .then(() => Promise.all([
            database.collection(USERS_COLLECTION).insertOne({username, password}),
            database.collection(TODO_LIST_COLLECTION).insertOne({username, tasks: []})
          ]))
          .then(() =>
          {
            response.status(200).json({message: "Successfully registered user.", token: userTokens.addUser(username)})
          })
          .catch(error =>
          {
            const {completed} = error

            if (!completed)
            {
              response.status(500).json({error: "Unable to register user"})
            }
          })
      }
    })
    .patch(multer().single(IMAGE_FIELD_NAME),
      addUsernameToRequest,
      ({username, body, file: {originalname, mimetype, buffer}}, response) =>
      {
        const resourceFile = {
          fileName: originalname,
          mimeType: mimetype,
          file: new Binary(buffer)
        }

        const resourceId = generateToken()
        const resourceDocument = Object.assign(resourceFile, {username}, {resourceId})

        const error = () => response.status(500).json({error: "Unable to update account."})

        database.collection(RESOURCE_COLLECTION).insertOne(resourceDocument)
          .then(() =>
          {
            const document = Object.assign({}, body, {imageFile: `/${resourceId}/${originalname}`})
            database.collection(USERS_COLLECTION).updateOne({username}, {$set: document})
              .then(() =>
              {
                response.status(200).json({result: "success"})
              })
              .catch(error)
          })
          .catch(error)
      }
    )

  router.use(addUsernameToRequest)

  router.get("/account/logout", ({username}, response) =>
  {
    userTokens.removeUser(username)
    response.json({message: "Successfully logged out", username})
  })

  return router
}

module.exports = route