FROM debian
COPY ./zephykus /zephykus
ENTRYPOINT /zephykus
