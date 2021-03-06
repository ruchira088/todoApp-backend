const express = require("express")
const moment = require("moment")

const {handleResult, generateToken, getNonNullValuesObject} = require("../utils")
const {TODO_LIST_COLLECTION} = require("../constants")

const createNewTask = ({id, task, progress = 0, dueDate}) => ({
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
    .all(({body}, response, next) =>
    {
      const {dueDate} = body

      if (dueDate)
      {
        const date = moment(dueDate, moment.ISO_8601)

        if (!date.isValid())
        {
          response.status(400)
            .json({error: "Date time format is NOT valid. Plese use the ISO 8601 date time format."})
        }
        else
        {
          body.dueDate = date.format()
          next()
        }
      } else
      {
        next()
      }
    })
    .post((request, response) =>
    {
      const {username, body: {task, dueDate}} = request

      const todoItem = createNewTask({ id: generateToken(1), dueDate, task })

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
      database.collection(TODO_LIST_COLLECTION).find({username}, {tasks: {$elemMatch: {id: body.id}}}).limit(1).toArray(
        handleResult(response, "Unable to update task.")(([document]) =>
        {
          const [task] = document.tasks

          const modifiedObject = Object.assign({}, createNewTask(task), getNonNullValuesObject(createNewTask(body)))
          updateTask(response)({username, id: body.id})(modifiedObject)
        })
      )
    })

  return router
}

module.exports = route