FROM python:3.6-slim

WORKDIR /usr/src

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc libffi-dev python3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --timeout=10000 --no-cache-dir rasa_nlu spacy rasa_core sklearn_crfsuite sklearn Flask\
    && python -m spacy download en \
    && apt-get purge -y --auto-remove build-essential gcc libffi-dev python3-dev

CMD ["python3"]