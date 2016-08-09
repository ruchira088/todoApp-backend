const express = require("express")
const moment = require("moment")

const {handleResult, generateToken, getNonNullValuesObject} = require("../utils")
const {TODO_LIST_COLLECTION} = require("../constants")

const createNewTask = ({id, task, progress, dueDate}) => ({
    id,
    task,
    progress,
    dueDate
})

const route = database =>
{
    const router = express.Router()

    const updateTask = response => ({username, id}) => final =>
    {
        database.collection(TODO_LIST_COLLECTION)
            .updateOne({username, "tasks.id": id}, {$set: {"tasks.$": final}},
                handleResult(response, "Unable to update task.")(({result: {n}}) =>
                {
                    if (n == 1)
                    {
                        response.json({username, todoItem: final})
                    } else
                    {
                        response.status(400).json({error: `task with id "${id}" NOT found.`})
                    }
                })
            )
    }

    router.route("/")
        .all(({body: {dueDate}}, response, next) =>
        {
            if (dueDate && !moment(dueDate, moment.ISO_8601).isValid())
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
                handleResult(response, "Unable to create task.")(() =>
                {
                    response.json({username, todoItem})
                }))
        })
        .put(({username, body}, response) =>
        {
            updateTask(response)({username, id: body.id})(createNewTask(body))
        })
        .patch(({username, body}, response) =>
        {
            // TODO Fix the patch request behaviour
            updateTask(response)({username, id: body.id})(getNonNullValuesObject(createNewTask(body)))
        })

    return router
}

module.exports = route