FROM cbengine

EXPOSE 5000

#ADD cb_datas /cb_datas/
#RUN python -m rasa_nlu.train -c /cb_datas/config_spacy.json

CMD ["python", "-m", "rasa_nlu.server"]
#CMD ["python", "-m", "rasa_nlu.server", "-c", "/cb_datas/config_spacy.json"]
