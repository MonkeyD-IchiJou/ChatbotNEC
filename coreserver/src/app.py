from flask import Flask, request, jsonify
import json
import yaml
from rasa_core.actions import Action
from rasa_core.agent import Agent
from rasa_core.interpreter import RasaNLUInterpreter
import rasa_core.train as rsTrain

# init the flask app
app = Flask(__name__)


@app.route('/query', methods=['POST'])
def query():
    return jsonify(success=True, response=request.get_json()['projectName'])


@app.route('/training', methods=['POST'])
def training():

    projectPath = "/app/dialogues/" + request.get_json()['projectName']
    tmpdomainPath = "/cbtmp/" + request.get_json()['projectName'] + '_domain.yml'
    tmpstoriesPath = "/cbtmp/" + request.get_json()['projectName'] + '_stories.md'

    # turn domain into yml format file
    domainfile = open(tmpdomainPath, 'w+')
    yaml.dump(request.get_json()['domain'], domainfile, default_flow_style=False)

    # turn stories into a file
    storiesfile = open(tmpstoriesPath, 'w+')
    storiesfile.write(request.get_json()['stories'])
    storiesfile.close()

    # this is how i train my dialogue
    additional_arguments = {"epochs": 300}
    rsTrain.train_dialogue_model(
        tmpdomainPath,
        tmpstoriesPath,
        projectPath,
        False,
        None,
        additional_arguments
    )

    return jsonify(success=True)


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
