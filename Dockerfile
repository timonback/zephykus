FROM debian
COPY ./backend/zephykus /zephykus
COPY ./frontend/dist /static/
ENTRYPOINT /zephykus
