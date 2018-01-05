FROM python:3.5.4-jessie

WORKDIR /usr/src

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en

EXPOSE 5000

#COPY GovTechBot /usr/data/

CMD ["python", "-m", "rasa_nlu.server"]