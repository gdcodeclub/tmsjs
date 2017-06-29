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
