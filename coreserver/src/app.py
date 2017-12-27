from flask import Flask, request, jsonify
import json
import yaml
import rasa_core.train as rsTrain

# init the flask app
app = Flask(__name__)


@app.route('/training', methods=['POST'])
def training():

    # setting up the project path (where to output my model).. /app/dialogues/_project_name
    projectPath = "/app/dialogues/" + request.get_json()['projectName']

    # tmp domain.yml dumping place.. /cbtmp/_project_name_domain.yml
    tmpdomainPath = "/cbtmp/" + request.get_json()['projectName'] + '_domain.yml'

    # tmp stories.md dumping place.. /cbtmp/_project_name_stories.md
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

    return jsonify(status='ready')


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
