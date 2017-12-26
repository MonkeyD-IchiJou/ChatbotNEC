from flask import Flask, request, jsonify
import json
import yaml

# init the flask app
app = Flask(__name__)


@app.route('/query', methods=['POST'])
def query():
    return jsonify(success=True, response=request.get_json()['projectName'])


@app.route('/training', methods=['POST'])
def training():
    # turn domain into yml format file
    domainfile = open('domain.yml', 'w+')
    yaml.dump(request.get_json()['domain'], domainfile, default_flow_style=False)

    # turn stories into a file
    storiesfile = open('stories.md', 'w+')
    storiesfile.write(request.get_json()['stories'])
    storiesfile.close()

    # this is how i train my dialogue
    #additional_arguments = {"epochs": 300}
    #rsTrain.train_dialogue_model("moodbot/domain.yml", "moodbot/data/stories.md", "moodbot/models/dialogue", False, None, additional_arguments)

    return jsonify(success=True)


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
