ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}node:18.1.0-buster as install
ADD ./package-lock.json ./package.json /hkube/monitor-server/
WORKDIR /hkube/monitor-server
RUN npm ci --production

ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}hkube/base-node:v2.0.1-buster
LABEL maintainer="yehiyam@gmail.com"
RUN mkdir /hkube
COPY . /hkube/monitor-server
COPY --from=install /hkube/monitor-server/node_modules /hkube/monitor-server/node_modules
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]