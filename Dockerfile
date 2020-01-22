FROM debian
COPY ./zephykus /zephykus
COPY ./frontend/dist /static/
ENTRYPOINT /zephykus
