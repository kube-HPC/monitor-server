ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}node:14.5.0 as install
ADD ./package-lock.json ./package.json /hkube/monitor-server/
WORKDIR /hkube/monitor-server
RUN npm ci --production

ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}hkube/base-node:v1.2.0
LABEL maintainer="yehiyam@gmail.com"
RUN mkdir /hkube
COPY . /hkube/monitor-server
COPY --from=install /hkube/monitor-server/node_modules /hkube/monitor-server/node_modules
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]