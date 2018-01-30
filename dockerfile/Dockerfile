FROM hkube/base-node:v1.0.0
MAINTAINER yehiyam@gmail.com
RUN mkdir /hkube
COPY . /hkube/monitor-server
RUN cd /hkube/monitor-server
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]