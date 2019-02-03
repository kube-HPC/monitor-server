ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}hkube/base-node:v1.1.1
LABEL maintainer="yehiyam@gmail.com"
RUN npm i -g nodemon
RUN mkdir /hkube
COPY . /hkube/monitor-server
RUN cd /hkube/monitor-server
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]