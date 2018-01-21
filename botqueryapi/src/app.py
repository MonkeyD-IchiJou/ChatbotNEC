from flask import Flask, request, jsonify
import json

from rasa_core.actions import Action
from rasa_core.agent import Agent
from rasa_core.interpreter import RasaNLUInterpreter

# init the flask app
app = Flask(__name__)
allagents = {}

# this is how i run my agent
def run(nlu_model_path, dialogue_model_path):
    interpreter = RasaNLUInterpreter(nlu_model_path)
    agent = Agent.load(dialogue_model_path, interpreter=interpreter)
    return agent


@app.route('/conversations', methods=['POST'])
def conversations():
    global allagents

    projectName = request.get_json()['projectName']

    if projectName in allagents:
        # this agent alr exist in the allagents
        return jsonify(allagents[projectName].start_message_handling(text_message=request.get_json()['text_message'], sender_id=request.get_json()['sender_id']))

    # if allagents haven't run this project yet
    # run this agent and store it
    allagents[projectName] = run(
        "/nluprojects/" + projectName + "/model",
        "/app/dialogues/" + projectName
    )
    return jsonify(allagents[projectName].start_message_handling(text_message=request.get_json()['text_message'], sender_id=request.get_json()['sender_id']))


@app.route('/querycontinue', methods=['POST'])
def querycontinue():
    global allagents

    projectName = request.get_json()['projectName']

    if projectName in allagents:
        # this agent alr exist in the allagents
        return jsonify(allagents[projectName].continue_message_handling(sender_id=request.get_json()['sender_id'], executed_action=request.get_json()['executed_action'], events=[]))

    # if this agent for some reason is not loaded yet...
    return jsonify(success='false', result='agent is not available')


@app.route('/botrefresh', methods=['POST'])
def botrefresh():
    global allagents

    projectName = request.get_json()['projectName']

    if projectName in allagents:
        # this agent alr exist in the allagents, delete it
        allagents.pop(projectName, 0)
        return jsonify(success='true', result='refreshed list')


    # if this agent for some reason is not loaded yet...
    return jsonify(success='true')



# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
