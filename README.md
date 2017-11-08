# TMSJS
Express app for demoing TMS

Currently only displays from addresses for an account, but there's more it will do: http://developer.govdelivery.com/api/tms/

## Running
1. Set TMS_URL to your URL with `export TMS_URL=https://stage-tms.govdelivery.com`
1. Set TMS_KEY to your API key with `export TMS_KEY=abcd123`

### Manually
1. Install node (need instructions)
1. Install project dependencies with `npm install`
1. Install MongoDB with `brew install mongodb`
1. Start MongoDB with `brew services start mongodb`
1. `node app.js` or `npm start`
1. http://localhost:8080/fa

#### Note on mongodb
You need mongodb running for all tests to pass. To start just the database run

`docker-compose up -d mongodb`

### Using Docker
Docker will handle all of the installation, project setup and deploy for you _if_ you have Docker installed on your machine -- see [this page](https://docs.docker.com/engine/installation/) for Docker installation instructions.

#### Build
Every time you add JavaScript libraries, make a change to Docker components, or before the first time your run the app with Docker run `docker-compose build`. When in doubt, run it -- running `docker-compose build` more often isn't bad, it just takes time and mayn't be necessary.

```
docker-compose build
```

#### Run
Start the container and access the application at http://localhost:8081
```
docker-compose up -d
```

## Tests
Make sure the application is running and then execute
```
npm run test
```

To run with code coverage
```
npm run itest
```

## Working with Docker
### ssh to a box
```
docker exec -it mongodb /bin/bash
```

## Working with Mongo
```
docker exec -it mongodb /bin/bash
mongo
use tmsjs
show collections
db.emails.find()
```
