from flask import Flask, request, jsonify
import json
import yaml
import rasa_core.train as rsTrain

# init the flask app
app = Flask(__name__)


def traindialogue(projectName):
    # setting up the project path (where to output my model).. /app/dialogues/_project_name
    projectPath = "/app/dialogues/" + projectName

    # turn stories into a file
    tmpstoriesPath = '/usr/' + projectName + '_stories.yml'
    storiesfile = open(tmpstoriesPath, 'w+')
    storiesfile.write(request.get_json()['stories'])
    storiesfile.close()

    # turn domain into yml format file
    tmpdomainPath = '/usr/' + projectName + '_domain.yml'
    domainfile = open(tmpdomainPath, 'w+')
    yaml.dump(request.get_json()['domain'], domainfile, default_flow_style=False)

    # this is how i train my dialogue
    additional_arguments = {"epochs": 100}
    rsTrain.train_dialogue_model(
        tmpdomainPath,
        tmpstoriesPath,
        projectPath,
        False,
        None,
        additional_arguments
    )


@app.route('/training', methods=['POST'])
def training():
    traindialogue(request.get_json()['projectName'])
    return jsonify(success=True, status='ready')


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
