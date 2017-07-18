# TMSJS
Express app for demoing TMS

Currently only displays from addresses for an account, but there's more it will do: http://developer.govdelivery.com/api/tms/

## Up...
1. Install node (need instructions)
1. Install project dependencies with `npm install`
1. Install MongoDB with `brew install mongodb`
1. Start MongoDB with `brew services start mongodb`

## ...and running
1. Set TMS_URL to your URL with `export TMS_URL=https://stage-tms.govdelivery.com`
1. Set TMS_KEY to your API key with `export TMS_KEY=abcd123`
1. `node app.js` or `npm start`
1. http://localhost:8080/fa

## Tests
```
npm run test
```

## Running with Docker
Docker will handle all of the installation, project setup and deploy for you _if_ you have Docker installed on your machine.

### Build
Every time you add JavaScript libraries, make a change to Docker components, or before the first time your run the app with Docker run `docker-compose build`

### Run
To start the container run `docker-compose up -d` and access the application at http://localhost:8081
