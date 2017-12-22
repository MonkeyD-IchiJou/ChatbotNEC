from flask import Flask, request, jsonify
import json
import yaml

# init the flask app
app = Flask(__name__)


@app.route('/qq')
def qq():
    return jsonify(success=True)


@app.route('/query', methods=['POST'])
def query():
    return jsonify(success=True, response=request.get_json()['projectName'])


@app.route('/train', methods=['POST'])
def train():
    # this is how i train my dialogue
    #additional_arguments = {"epochs": 300}
    #rsTrain.train_dialogue_model("moodbot/domain.yml", "moodbot/data/stories.md", "moodbot/models/dialogue", False, None, additional_arguments)
    ff = open('meta.yml', 'w+')
    yaml.dump(request.get_json(), ff,default_flow_style=False)

    return jsonify(success = True)


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
