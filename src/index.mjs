import app, { server } from './app.mjs'

const port = process.env.PORT
server.listen(port, () => console.log('Server is up on port ' + port))