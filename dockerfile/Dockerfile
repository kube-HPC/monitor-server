FROM node:8-alpine
MAINTAINER yehiyam@gmail.com
RUN apk --update add nano && \
    rm -rf /var/cache/apk/*
RUN mkdir /hkube
COPY . /hkube/monitor-server
RUN cd /hkube/monitor-server && npm rebuild
WORKDIR /hkube/monitor-server
CMD ["node", "app.js"]