FROM python:3.5-slim

WORKDIR /usr/src

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc libffi-dev python3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --timeout=10000 --no-cache-dir rasa_nlu spacy rasa_core sklearn_crfsuite sklearn Flask\
    && python -m spacy download en \
    && apt-get purge -y --auto-remove build-essential gcc libffi-dev python3-dev

#ADD cb_datas /cb_datas/

EXPOSE 5000

#RUN python -m rasa_nlu.train -c /cb_datas/config_spacy.json
CMD ["python", "-m", "rasa_nlu.server", "-c", "/cb_datas/config_spacy.json"]