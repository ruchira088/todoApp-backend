const express = require("express")
const {handleResult} = require("../utils")
const { TODO_LIST_COLLECTION } = require("../constants")

const route = database =>
{
    const router = express.Router()

    router.route("/")
        .get(({username}, response) =>
        {
            database.collection(TODO_LIST_COLLECTION).find({username}).limit(1).toArray(
                handleResult(response, "Unable to fetch the todo list")(docs =>
                {
                    response.json({username, tasks: docs[0].tasks})
                }))
        })

    return router
}

module.exports = route