module.exports = {
    handleResult: (response, errorMessage = "Unable to perform DB operation") => success => (err, results) =>
    {
        if (err)
        {
            response.status(500).json({error: errorMessage})
        } else
        {
            success(results)
        }
    },
    generateToken: function createToken(strength = 2, output = "")
    {
        if (strength === 0)
        {
            return output
        }

        return createToken(strength - 1, output + Math.random().toString(36).substring(2))
    },
    getNonNullValuesObject: object => Object.keys(object)
        .filter(key => object[key] != null)
        .reduce((output, key) => Object.assign({}, output, {[key]: object[key]}), {})
}