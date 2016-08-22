module.exports = {
    IMAGE_FIELD_NAME: "imageFile",
    PORT: 8000,
    RESOURCE_COLLECTION: "resources",
    USERS_COLLECTION: "users",
    TODO_LIST_COLLECTION: "todo-list-items",
    MONGO_DB_URL: "mongodb://localhost:27017/todo-list",
    ROUTES : {
        ROOT: "/",
        RESOURCES: "/resources",
        LIST: "/list",
        TASK: "/task"
    }
}