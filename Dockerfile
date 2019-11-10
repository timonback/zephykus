FROM debian
COPY ./zephykus /zephykus
COPY ./frontend/dist /static/
COPY ./frontend/index.html /static/index.html
ENTRYPOINT /zephykus
