const express = require("express")
const {handleResult, generateToken} = require("../utils")

const {TODO_LIST_COLLECTION, USERS_COLLECTION} = require("../constants")

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
            }
        })

    router.use((request, response, next) =>
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

    router.get("/account/logout", ({username}, response) =>
        {
            userTokens.removeUser(username)
            response.json({message: "Successfully logged out", username})
        })

    return router
}

module.exports = route