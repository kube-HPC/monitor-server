FROM node:8
MAINTAINER yehiyam@gmail.com
RUN apt update && apt install nano
RUN mkdir /hkube
COPY . /hkube/monitor-server
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]