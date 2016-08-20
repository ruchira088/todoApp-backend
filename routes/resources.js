const {Router} = require("express")
const {RESOURCE_COLLECTION} = require("../constants")

const route = database =>
{
  const router = Router()

  router
    .get("/:resourceId/:fileName",
      ({params: {resourceId, fileName}}, response) =>
      {

        database.collection(RESOURCE_COLLECTION).find({resourceId, fileName}).limit(1).toArray()
          .then(([resource]) =>
          {
            if (resource)
            {
              const {mimeType, file} = resource
              response.set({"Content-Type": mimeType})
              response.status(200).send(file.buffer)
            }
            else
            {
              response.status(404).send()
            }
          })
          .catch(error => response.status(500).json({error}))
      })

  router
    .get("/", (request, response) => response.status(404).send())

  return router
}

module.exports = route