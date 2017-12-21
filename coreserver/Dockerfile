FROM python:3.6-stretch

WORKDIR /usr/src

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src /usr/src/

EXPOSE 80

CMD [ "python", "./app.py" ]