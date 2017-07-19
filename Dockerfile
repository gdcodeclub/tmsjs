FROM node:8.1.2

RUN apt-get update && apt-get install mongodb -y
RUN mkdir -p /usr/src/tmsjs
RUN useradd -ms /bin/bash tmsjs
RUN chown tmsjs /usr/src/tmsjs
USER tmsjs
RUN mongod --smallfiles --logpath /var/log/mongodb/mongo.log &
WORKDIR /usr/src/tmsjs
RUN npm install
CMD ["npm", "start"]
