FROM scratch
COPY ./zephykus /bin/zephykus
COPY ./frontend/dist /static/
ENTRYPOINT ["/bin/zephykus"]
