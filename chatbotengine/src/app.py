from flask import Flask, request, jsonify
import json
import yaml

from rasa_core.actions import Action
from rasa_core.agent import Agent
from rasa_core.interpreter import RasaNLUInterpreter

# init the flask app
app = Flask(__name__)

# this is how i run my agent
def run(nlu_model_path, dialogue_model_path):
    interpreter = RasaNLUInterpreter(nlu_model_path)
    agent = Agent.load(dialogue_model_path, interpreter=interpreter)
    return agent


@app.route('/query', methods=['POST'])
def query():
    projectName = request.get_json()['projectName']
    # future optimising: store this agent in this server, do not keep on running the same agent
    myagent = run(
        "/app/projects/" + projectName + "/model", 
        "/app/dialogues/" + projectName
    )
    return jsonify(myagent.handle_message(text_message=request.get_json()['text_message'], sender_id=request.get_json()['sender_id']))


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
